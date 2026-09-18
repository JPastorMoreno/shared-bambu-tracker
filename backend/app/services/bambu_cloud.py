import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

BAMBU_API_BASE_URL = "https://api.bambulab.com"
LOGIN_PATH = "/v1/user-service/user/login"
EMAIL_CODE_PATH = "/v1/user-service/user/sendemail/code"
TASKS_PATH = "/v1/user-service/my/tasks"
DESIGN_PATH = "/v1/design-service/design/{design_id}"

TOKEN_VALIDEZ_DIAS = 90

# User-Agent de navegador por precaución: algunos WAF bloquean el User-Agent por
# defecto de httpx en clientes que no son un navegador.
CABECERAS_NAVEGADOR = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    )
}


class BambuAuthError(Exception):
    def __init__(self, message: str):
        super().__init__(message[:200])


class BambuSyncError(Exception):
    def __init__(self, message: str):
        super().__init__(message[:200])


@dataclass
class BambuLoginIniciado:
    login_session_id: str
    requires_code: bool


@dataclass
class BambuToken:
    access_token: str
    expires_at: datetime
    email: str


@dataclass
class BambuTaskDTO:
    external_task_id: str
    printed_at: datetime
    model_name: str
    print_duration_min: int | None = None
    thumbnail_url: str | None = None
    grams_used_estimado: float | None = None


@dataclass
class BambuDesignFilamentDTO:
    type: str
    color_hex: str | None
    grams: float


@dataclass
class BambuDesignInstanceDTO:
    id: int
    title: str
    is_default: bool
    total_grams: float
    estimated_seconds: int | None
    filaments: list[BambuDesignFilamentDTO]


@dataclass
class BambuDesignDTO:
    title: str
    cover_url: str | None
    instances: list[BambuDesignInstanceDTO]


class BambuCloudClient:
    """Cliente de la API cloud no oficial de Bambu Lab (sin API pública documentada).

    El region no se usa en estas llamadas HTTP: solo afecta al host de MQTT que este
    cliente todavía no implementa. Se conserva en la interfaz por si se añade sync por
    MQTT más adelante.
    """

    def __init__(self):
        self._sesiones_login: dict[str, dict] = {}

    async def iniciar_login(self, email: str, password: str, region: str) -> BambuLoginIniciado:
        data = await self._post_bambu(LOGIN_PATH, {"account": email, "password": password, "apiError": ""})

        access_token = data.get("accessToken")
        if access_token:
            login_session_id = str(uuid.uuid4())
            self._sesiones_login[login_session_id] = {"email": email, "access_token": access_token}
            return BambuLoginIniciado(login_session_id=login_session_id, requires_code=False)

        login_type = data.get("loginType")
        if login_type == "verifyCode":
            await self._post_bambu_sin_respuesta(EMAIL_CODE_PATH, {"email": email, "type": "codeLogin"})
            login_session_id = str(uuid.uuid4())
            self._sesiones_login[login_session_id] = {"email": email}
            return BambuLoginIniciado(login_session_id=login_session_id, requires_code=True)

        if login_type == "tfa":
            raise BambuAuthError(
                "Esta cuenta tiene activada la verificación en dos pasos por app "
                "(autenticador), que todavía no está soportada aquí. Desactívala "
                "temporalmente en la cuenta de Bambu Lab o usa solo el código por email."
            )

        raise BambuAuthError(f"Respuesta inesperada de Bambu Cloud al iniciar sesión: {str(data)}")

    async def verificar_codigo(self, login_session_id: str, code: str) -> BambuToken:
        sesion = self._sesiones_login.get(login_session_id)
        if sesion is None:
            raise BambuAuthError("Sesión de login desconocida o expirada, vuelve a iniciar sesión")

        if sesion.get("access_token"):
            access_token = sesion["access_token"]
        else:
            data = await self._post_bambu(
                LOGIN_PATH, {"account": sesion["email"], "code": code}
            )
            access_token = data.get("accessToken")
            if not access_token:
                raise BambuAuthError("Código incorrecto o caducado")

        del self._sesiones_login[login_session_id]
        expires_at = datetime.now(timezone.utc) + timedelta(days=TOKEN_VALIDEZ_DIAS)
        return BambuToken(access_token=access_token, expires_at=expires_at, email=sesion["email"])

    async def obtener_tareas(self, access_token: str, region: str) -> list[BambuTaskDTO]:
        try:
            async with httpx.AsyncClient(base_url=BAMBU_API_BASE_URL, timeout=10.0) as client:
                response = await client.get(
                    TASKS_PATH,
                    headers={**CABECERAS_NAVEGADOR, "Authorization": f"Bearer {access_token}"},
                )
                response.raise_for_status()
                data = response.json()
        except (httpx.HTTPError, ValueError) as e:
            logger.debug("Fallo al obtener tareas Bambu: %s", str(e)[:80])
            raise BambuSyncError(f"No se pudieron obtener las tareas: {str(e)}") from e

        tareas = []
        for item in data.get("hits", []):
            inicio = item.get("startTime")
            if not inicio:
                continue
            printed_at = datetime.fromisoformat(inicio)
            cost_time_seg = item.get("costTime")
            tareas.append(
                BambuTaskDTO(
                    external_task_id=str(item.get("id")),
                    printed_at=printed_at,
                    model_name=item.get("designTitle") or item.get("title", ""),
                    print_duration_min=cost_time_seg // 60 if cost_time_seg else None,
                    thumbnail_url=item.get("cover"),
                    grams_used_estimado=item.get("weight"),
                )
            )
        return tareas

    async def obtener_diseno(self, access_token: str, design_id: int) -> BambuDesignDTO:
        """Datos públicos de un diseño de MakerWorld (mismo token de cuenta que el
        resto de la API cloud): título y, por cada perfil/instancia de impresión,
        gramos totales y filamentos usados según las placas ya sliceadas."""
        try:
            async with httpx.AsyncClient(base_url=BAMBU_API_BASE_URL, timeout=10.0) as client:
                response = await client.get(
                    DESIGN_PATH.format(design_id=design_id),
                    headers={**CABECERAS_NAVEGADOR, "Authorization": f"Bearer {access_token}"},
                )
                response.raise_for_status()
                data = response.json()
        except (httpx.HTTPError, ValueError) as e:
            logger.debug("Fallo al obtener diseño %s de MakerWorld: %s", design_id, str(e)[:80])
            raise BambuSyncError(f"No se pudo obtener el diseño de MakerWorld: {str(e)}") from e

        default_instance_id = data.get("defaultInstanceId")
        instances = []
        for instance in data.get("instances") or []:
            extension = instance.get("extention") or {}
            model_info = extension.get("modelInfo") or {}
            plates = model_info.get("plates") or []
            total_grams = sum(plate.get("weight") or 0 for plate in plates)
            estimated_seconds = sum(plate.get("prediction") or 0 for plate in plates) or None

            gramos_por_filamento: dict[tuple[str, str], float] = {}
            for plate in plates:
                for filamento in plate.get("filaments") or []:
                    clave = (filamento.get("type", ""), filamento.get("color", ""))
                    gramos_por_filamento[clave] = gramos_por_filamento.get(clave, 0.0) + float(
                        filamento.get("usedG") or 0
                    )

            instances.append(
                BambuDesignInstanceDTO(
                    id=instance.get("id"),
                    title=instance.get("title") or "Perfil sin nombre",
                    is_default=instance.get("id") == default_instance_id,
                    total_grams=round(total_grams, 1),
                    estimated_seconds=estimated_seconds,
                    filaments=[
                        BambuDesignFilamentDTO(type=tipo, color_hex=color or None, grams=round(gramos, 1))
                        for (tipo, color), gramos in gramos_por_filamento.items()
                    ],
                )
            )

        return BambuDesignDTO(
            title=data.get("title", ""), cover_url=data.get("coverUrl"), instances=instances
        )

    async def _post_bambu(self, path: str, payload: dict) -> dict:
        try:
            async with httpx.AsyncClient(base_url=BAMBU_API_BASE_URL, timeout=10.0) as client:
                response = await client.post(path, json=payload, headers=CABECERAS_NAVEGADOR)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.debug("Bambu Cloud respondió %s en %s", e.response.status_code, path)
            raise BambuAuthError(
                f"Bambu Cloud rechazó la petición ({e.response.status_code}): {e.response.text}"
            ) from e
        except (httpx.HTTPError, ValueError) as e:
            logger.debug("Fallo de red contra Bambu Cloud en %s: %s", path, str(e)[:80])
            raise BambuAuthError(f"No se pudo contactar con Bambu Cloud: {str(e)}") from e

    async def _post_bambu_sin_respuesta(self, path: str, payload: dict) -> None:
        """Como _post_bambu pero para endpoints que no devuelven un cuerpo JSON útil
        (p.ej. el envío del código por email), donde solo importa que no haya fallado."""
        try:
            async with httpx.AsyncClient(base_url=BAMBU_API_BASE_URL, timeout=10.0) as client:
                response = await client.post(path, json=payload, headers=CABECERAS_NAVEGADOR)
                response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.debug("Bambu Cloud respondió %s en %s", e.response.status_code, path)
            raise BambuAuthError(
                f"Bambu Cloud rechazó la petición ({e.response.status_code}): {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            logger.debug("Fallo de red contra Bambu Cloud en %s: %s", path, str(e)[:80])
            raise BambuAuthError(f"No se pudo contactar con Bambu Cloud: {str(e)}") from e
