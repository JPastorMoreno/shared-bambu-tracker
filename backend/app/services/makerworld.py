import re

_PATRON_DESIGN_ID = re.compile(r"makerworld\.com/(?:[a-z]{2}/)?models/(\d+)", re.IGNORECASE)


def extraer_design_id(url: str) -> int | None:
    coincidencia = _PATRON_DESIGN_ID.search(url)
    return int(coincidencia.group(1)) if coincidencia else None
