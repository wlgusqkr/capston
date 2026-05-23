"""
=============================================================================
?¨Í∏∞Î°úÏö¥ ?êÏ∑®?ùÌôú - AI Agent Î©îÏù∏ ?åÏù¥?ÑÎùº??(agent.py)
=============================================================================
??Î™®Îìà?Ä ?¨Ïö©??ÏßàÎ¨∏??Î∞õÏïÑ DB Ï°∞ÌöåÎ•??µÌï¥ ?µÎ????ùÏÑ±?òÎäî ?ÑÏ≤¥ Í≥ºÏ†ï??Ï°∞Ïú®?©Îãà??

[?µÏã¨ ?åÏù¥?ÑÎùº??
  1. ÏßàÎ¨∏ Î∂ÑÎ•ò (Classification): ÏßàÎ¨∏???òÎèÑÎ•??åÏïÖ?òÍ≥† ?ÑÏöî???åÏù¥Î∏îÍ≥º Ï°∞Ïù∏ ?åÌä∏Î•?Ï∂îÏ∂ú?©Îãà??
  2. SQL ?§Ìñâ (Text-to-SQL): LLM???úÏö©??ÏøºÎ¶¨Î•??ùÏÑ±?òÍ≥†, DB?êÏÑú ?§Ìñâ Î∞??àÏßà??Í≤ÄÏ¶ùÌï©?àÎã§.
  3. ?ëÎãµ ?ùÏÑ± (Selection/Info): Ï°∞Ìöå???∞Ïù¥?∞Î? Í∏∞Î∞ò?ºÎ°ú ?¨Ïö©??ÎßûÏ∂§???êÏó∞???µÎ?Í≥??úÍ∞Å???∞Ïù¥?∞Î? Íµ¨ÏÑ±?©Îãà??

[?§Ìñâ Î∞©Î≤ï]
  - ?®ÌÇ§ÏßÄ ?§Ïπò: pip install langchain langchain-openai langchain-community sqlalchemy psycopg2-binary python-dotenv pyyaml
  - ?∞Î????òÍ≤Ω: python agent.py "ÏßàÎ¨∏ ?¥Ïö©"
  - ?Ä?îÌòï Î™®Îìú: python agent.py ?§Ìñâ ???ÑÎ°¨?ÑÌä∏??ÏßàÎ¨∏ ?ÖÎ†•
=============================================================================
"""

import json
import time
import argparse
from dotenv import load_dotenv

load_dotenv()

from langchain_core.messages import SystemMessage, HumanMessage

from db import get_db, get_llm, get_schema_context, get_config, get_stage_model, get_store_codes_text
from schemas import ClassificationOutput, SelectionOutput, InfoOutput
from sql_runner import run_text_to_sql
from prompts import CLASSIFICATION_PROMPT, SELECTION_PROMPT, INFO_ANSWER_PROMPT


def run_agent(question: str) -> dict:
    """
    ?åÏù¥?ÑÎùº??
      1?®Í≥Ñ: ÏßàÎ¨∏ Î∂ÑÎ•ò  ??route / query_type / needed_tables / join_hint
      2?®Í≥Ñ: SQL ?§Ìñâ   ??Text-to-SQL + YAML ?åÌä∏ + ?¨Ïãú??
      3?®Í≥Ñ: ?ëÎãµ ?ùÏÑ±  ??query_typeÎ≥?Î∂ÑÍ∏∞ (config.yaml??query_types Í∏∞Î∞ò)
    """
    start = time.time()
    cfg = get_config()
    pipeline_cfg = cfg.get("pipeline", {})
    max_neighborhoods = pipeline_cfg.get("max_neighborhoods", 2)

    print(f"\n{'='*60}")
    print(f"ÏßàÎ¨∏: {question}")
    print(f"{'='*60}")

    schema_context = get_schema_context()

    # ?Ä?Ä 1?®Í≥Ñ: ÏßàÎ¨∏ Î∂ÑÎ•ò ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
    print("\n[1?®Í≥Ñ] ÏßàÎ¨∏ Î∂ÑÎ•ò Ï§?..")
    llm_cls = get_llm(get_stage_model("classification"))
    classification = llm_cls.with_structured_output(
        ClassificationOutput, method="function_calling"
    ).invoke([
        SystemMessage(content=CLASSIFICATION_PROMPT.format(
            schema_context=schema_context,
            store_codes=get_store_codes_text(),   # config.yaml?êÏÑú ?ôÏ†Å Ï£ºÏûÖ
        )),
        HumanMessage(content=question),
    ])

    print(f"  route:         {classification.route}")
    print(f"  query_type:    {classification.query_type}")
    print(f"  needed_tables: {classification.needed_tables}")
    print(f"  join_hint:     {classification.join_hint}")

    if classification.route in {"direct", "blocked"}:
        if classification.route == "blocked":
            answer = "?Ä???úÏö∏ ?êÏ∑®/?ôÎÑ§ Ï∂îÏ≤ú ?úÎπÑ?§Ïòà?? ?ôÎÑ§ Ï∂îÏ≤ú, ?îÏÑ∏, Ï£ºÎ? ?úÏÑ§ ?±Ïóê ?Ä??Î¨ºÏñ¥Î¥?Ï£ºÏÑ∏?? ?òä"
        else:
            answer = classification.message

        return {
            "answer": answer,
            "neighborhoods": [],
            "visualizations": [],
            "route": classification.route,
            "query_type": classification.query_type,
            "sql": None,
            "elapsed_sec": round(time.time() - start, 2),
        }

    # ?Ä?Ä 2?®Í≥Ñ: SQL ?§Ìñâ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
    print("\n[2?®Í≥Ñ] SQL ?ùÏÑ± Î∞??§Ìñâ Ï§?..")
    sql_result = run_text_to_sql(
        question=question,
        needed_tables=classification.needed_tables,
        join_hint=classification.join_hint,
        sql_plans=[p.model_dump() for p in classification.sql_plans],
    )

    # ?Ä?Ä 3?®Í≥Ñ: query_typeÎ≥?Î∂ÑÍ∏∞ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
    query_types_cfg = cfg.get("query_types", {})
    qt_cfg = query_types_cfg.get(classification.query_type, {})
    steps = qt_cfg.get("steps", [])

    if "info_answer" in steps:
        print("\n[3?®Í≥Ñ] ?ïÎ≥¥ Ï°∞Ìöå ?µÎ? ?ùÏÑ± Ï§?..")
        llm_info = get_llm(get_stage_model("info_answer"))

        info_result = llm_info.with_structured_output(
            InfoOutput, method="function_calling"
        ).invoke([
            SystemMessage(content=INFO_ANSWER_PROMPT),
            HumanMessage(content=f"ÏßàÎ¨∏: {question}\nSQL Í≤∞Í≥º: {sql_result['result'] or 'Ï°∞Ìöå Í≤∞Í≥º ?ÜÏùå'}"),
        ])

        elapsed = round(time.time() - start, 2)
        print(f"\n[ÏµúÏ¢Ö ?µÎ?]\n{info_result.answer}")
        print(f"\nÏ¥??åÏöî?úÍ∞Ñ: {elapsed}Ï¥?| SQL ?úÎèÑ: {sql_result.get('attempts', 0)}??)

        return {
            "answer": info_result.answer,
            "neighborhoods": [],
            "visualizations": [
                {
                    "type": info_result.visualization_type,
                    "title": info_result.visualization_title,
                    "unit": "",
                    "data": [d.model_dump() for d in info_result.visualization_data],
                }
            ] if info_result.visualization_type != "none" else [],
            "route": "db",
            "query_type": classification.query_type,
            "sql": sql_result.get("sql"),
            "sql_attempts": sql_result.get("attempts", 0),
            "elapsed_sec": elapsed,
        }

    if "selection" in steps:
        print("\n[3?®Í≥Ñ] ?ôÎÑ§ ?†Ï†ï Ï§?..")
        llm_sel = get_llm(get_stage_model("selection"))

        selection = llm_sel.with_structured_output(
            SelectionOutput, method="function_calling"
        ).invoke([
            SystemMessage(content=SELECTION_PROMPT.format(
                question=question,
                sql_result=sql_result["result"] or "Ï°∞Ìöå Í≤∞Í≥º ?ÜÏùå",
                max_neighborhoods=max_neighborhoods,
            )),
            HumanMessage(content=question),
        ])

        # Î≥¥Í∞ï ÏøºÎ¶¨ ?§Ìñâ
        if selection.additional_sql:
            print(f"\n[Î≥¥Í∞ï ÏøºÎ¶¨]\n{selection.additional_sql}")
            try:
                db = get_db()
                extra = db.run(selection.additional_sql)
                print(f"[Î≥¥Í∞ï Í≤∞Í≥º] {extra[:200] if extra else 'ÎπÑÏñ¥?àÏùå'}")

                if extra and extra.strip() not in ("", "[]"):
                    enriched = (
                        f"{sql_result['result']}"
                        f"\n\n[Î≥¥Í∞ï ?∞Ïù¥????ÎπÑÍµê Í∏∞Ï?]\n"
                        f"SQL: {selection.additional_sql}\n"
                        f"Í≤∞Í≥º: {extra}\n"
                        f"???úÏ§Ñ?? data_summary, visualization_data??Î∞òÎìú??Î∞òÏòÅ?òÏÑ∏??
                    )
                    selection = llm_sel.with_structured_output(
                        SelectionOutput, method="function_calling"
                    ).invoke([
                        SystemMessage(content=SELECTION_PROMPT.format(
                            question=question,
                            sql_result=enriched,
                            max_neighborhoods=max_neighborhoods,
                        )),
                        HumanMessage(content=question),
                    ])
            except Exception as e:
                print(f"[Î≥¥Í∞ï ÏøºÎ¶¨ ?§Ìå®] {e}")

        elapsed = round(time.time() - start, 2)
        print(f"\n[ÏµúÏ¢Ö ?µÎ?]\n{selection.answer}")
        print(f"\nÏ¥??åÏöî?úÍ∞Ñ: {elapsed}Ï¥?| SQL ?úÎèÑ: {sql_result.get('attempts', 0)}??)

        return {
            "answer": selection.answer,
            "neighborhoods": [n.model_dump() for n in selection.neighborhoods],
            "visualizations": [
                {
                    "type": v.type,
                    "title": v.title,
                    "unit": v.unit,
                    "data": [d.model_dump() for d in v.data],
                }
                for v in selection.visualizations
            ],
            "route": "db",
            "query_type": classification.query_type,
            "sql": sql_result.get("sql"),
            "sql_attempts": sql_result.get("attempts", 0),
            "elapsed_sec": elapsed,
        }

    # stepsÍ∞Ä ÎπÑÏñ¥?àÎäî Í≤ΩÏö∞ (direct/blockedÍ∞Ä ?ÑÎãå??query_type Îß§Ìïë ?ÜÎäî Í≤ΩÏö∞)
    elapsed = round(time.time() - start, 2)
    return {
        "answer": "Ï≤òÎ¶¨?????ÜÎäî ?îÏ≤≠?ÖÎãà??",
        "neighborhoods": [],
        "visualizations": [],
        "route": classification.route,
        "query_type": classification.query_type,
        "sql": None,
        "elapsed_sec": elapsed,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="?¨Í∏∞Î°úÏö¥ ?êÏ∑®?ùÌôú AI Agent")
    parser.add_argument("question", nargs="?", default=None)
    args = parser.parse_args()

    if args.question:
        result = run_agent(args.question)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("?¨Í∏∞Î°úÏö¥ ?êÏ∑®?ùÌôú AI Agent")
        print("Ï¢ÖÎ£å: Ctrl+C\n")
        while True:
            try:
                q = input("ÏßàÎ¨∏: ").strip()
                if q:
                    result = run_agent(q)
                    print(json.dumps(result, ensure_ascii=False, indent=2))
            except KeyboardInterrupt:
                print("\nÏ¢ÖÎ£å?©Îãà??")
                break
