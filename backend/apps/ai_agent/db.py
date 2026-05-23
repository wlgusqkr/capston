"""
=============================================================================
?°ì´?°ë² ?´ìŠ¤ ë°??¤ì • ê´€ë¦?ëª¨ë“ˆ (db.py)
=============================================================================
DB ?°ê²°ë¶€???œìŠ¤??ë©”í??°ì´??ë°?LLM ëª¨ë¸ ê°ì²´ ?ì„±ê¹Œì? ê³µí†µ?ìœ¼ë¡??¬ìš©?˜ëŠ”
?µì‹¬ ? í‹¸ë¦¬í‹° ?¨ìˆ˜?¤ì„ ?œê³µ?©ë‹ˆ??

[ì£¼ìš” ??• ]
  - YAML ?¤ì • ë¡œë“œ: config.yaml(ëª¨ë¸/?Œì´?„ë¼?? ë°?table_metadata.yaml(ì¡°ì¸/?Œì´ë¸??•ë³´) ìºì‹±
  - DB ?°ê²°: PostgreSQL ?°ê²° ë°?SQLAlchemy ?¸ìŠ¤?´ìŠ¤ ?œê³µ
  - ?¤í‚¤ë§?ê´€ë¦? DB ?¤í‚¤ë§?ë¡œë“œ ë°?ìºì‹±, ?„ë¡¬?„íŠ¸???¤í‚¤ë§?ì»¨í…?¤íŠ¸ ë°˜í™˜
  - LLM ?¸ìŠ¤?´ìŠ¤: ê°??¨ê³„ë³??”êµ¬?¬í•­(ë¹ ë¥¸ ?ë„ vs ?’ì? ì§€????ë§ëŠ” LangChain OpenAI ê°ì²´ ë°˜í™˜
=============================================================================
"""
import os
import warnings
import yaml
from functools import lru_cache
from dotenv import load_dotenv 

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))  

from langchain_community.utilities import SQLDatabase
from langchain_openai import ChatOpenAI
from sqlalchemy.exc import SAWarning

_SCHEMA_CONTEXT_CACHE: str | None = None


# ?€?€ ?¤ì • ë¡œë” ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
@lru_cache(maxsize=1)
def get_config() -> dict:
    """config.yaml??ë¡œë“œ?©ë‹ˆ??(ìºì‹œ)."""
    path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


@lru_cache(maxsize=1)
def get_table_metadata() -> dict:
    """table_metadata.yaml??ë¡œë“œ?©ë‹ˆ??(ìºì‹œ)."""
    path = os.path.join(os.path.dirname(__file__), "table_metadata.yaml")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except FileNotFoundError:
        return {}


def get_store_codes_text() -> str:
    """config.yaml??store_codesë¥??„ë¡¬?„íŠ¸???ìŠ¤?¸ë¡œ ë³€?˜í•©?ˆë‹¤."""
    codes = get_config().get("store_codes", {})
    return "\n".join(f"{name}: {code}" for name, code in codes.items())


def get_join_hints(needed_tables: list[str]) -> str:
    """needed_tables???´ë‹¹?˜ëŠ” ì¡°ì¸ ?ŒíŠ¸ë¥?YAML?ì„œ ë¡œë“œ??ë°˜í™˜?©ë‹ˆ??"""
    metadata = get_table_metadata()
    hints = []

    for table in needed_tables:
        if table not in metadata:
            continue
        m = metadata[table]
        lines = [f"[{table}] {m.get('description', '')}"]
        for key, label in [
            ("join_path", "ì¡°ì¸"),
            ("sub_join", "?œë¸Œì¡°ì¸"),
            ("bridge_table", "ë¸Œë¦¿ì§€"),
            ("filters", "?„í„°"),
            ("to_rent_deal", "?”ì„¸ ê²½ë¡œ"),
            ("to_facility", "?œì„¤ ê²½ë¡œ"),
            ("note", "ì£¼ì˜"),
        ]:
            if m.get(key):
                lines.append(f"  {label}: {m[key]}")
        hints.append("\n".join(lines))

    return "\n\n".join(hints)


# ?€?€ DB ?°ê²° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
def _build_database_url() -> str:
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        if "sslmode=" not in database_url:
            database_url += "?sslmode=require"
        return database_url

    required = ["DB_USER", "DB_PASSWORD", "DB_HOST"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"?„ë½???˜ê²½ë³€?? {', '.join(missing)}")

    return (
        f"postgresql+psycopg2://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}"
        f"@{os.environ['DB_HOST']}:{os.environ.get('DB_PORT', 5432)}"
        f"/{os.environ.get('DB_NAME', 'dp_db')}"
    )


def get_db() -> SQLDatabase:
    warnings.filterwarnings("ignore", category=SAWarning)
    return SQLDatabase.from_uri(
        _build_database_url(),
        sample_rows_in_table_info=2,
    )


def get_schema_context() -> str:
    global _SCHEMA_CONTEXT_CACHE
    if _SCHEMA_CONTEXT_CACHE:
        return _SCHEMA_CONTEXT_CACHE

    db = get_db()
    try:
        all_tables = db.get_usable_table_names()
        if "spatial_ref_sys" in all_tables:
            all_tables.remove("spatial_ref_sys")
        if all_tables:
            _SCHEMA_CONTEXT_CACHE = db.get_table_info(table_names=all_tables)
            print(f"\n[?œìŠ¤???ˆë‚´] ê³µê³µ ?°ì´???Œì´ë¸?{len(all_tables)}ê°œì˜ ?¤í‚¤ë§ˆë? ?±ê³µ?ìœ¼ë¡?ë¡œë“œ?ˆìŠµ?ˆë‹¤.")
        else:
            _SCHEMA_CONTEXT_CACHE = db.get_table_info()
    except Exception as e:
        print(f"\n[?œìŠ¤??ê²½ê³ ] ?¤í‚¤ë§?ë¡œë“œ ì¤??¤ë¥˜: {e}")
        _SCHEMA_CONTEXT_CACHE = db.get_table_info()

    return _SCHEMA_CONTEXT_CACHE


def get_filtered_schema_context(table_names: list[str]) -> str:
    db = get_db()
    try:
        usable = db.get_usable_table_names()
        valid = [t for t in table_names if t in usable]
        if not valid:
            return get_schema_context()
        return db.get_table_info(valid)
    except Exception:
        return get_schema_context()


def get_llm(model_key: str, temperature: float = 0) -> ChatOpenAI:
    cfg = get_config()
    models = cfg.get("models", {"fast": "gpt-4o-mini", "smart": "gpt-4o"})
    sql_cfg = cfg.get("sql", {})

    return ChatOpenAI(
        model=models.get(model_key, models.get("smart", "gpt-4o")),
        temperature=temperature,
        timeout=sql_cfg.get("timeout", 60),
        max_retries=sql_cfg.get("max_retries", 6),
    )


def get_stage_model(stage: str) -> str:
    """config.yaml??stage_models?ì„œ ?¨ê³„ë³?ëª¨ë¸ ?¤ë? ë°˜í™˜?©ë‹ˆ??"""
    cfg = get_config()
    stage_models = cfg.get("stage_models", {})
    return stage_models.get(stage, cfg.get("models", {}).get("default", "smart"))
