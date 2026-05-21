"""
팔자연구소 - Compatibility Engine
두 사람의 생년월일 → 관계 유형 판정 (Layer 1~4)

의존: period_engine.py, matrix4d.json (동일 디렉터리)
"""

import json
import os
from typing import Optional

from period_engine import birthdate_to_period, calculate_aspect

RELATIONSHIP_TYPES = {
    1: "평화와 영적 조화",
    2: "통제와 복종의 구도",
    3: "드라마틱한 스파크",
    4: "건설적 비즈니스 파트너십",
    5: "소통과 지적 자극",
    6: "동요와 감정의 격랑",
    7: "소유와 집착의 감옥",
    8: "담백한 자연주의 친구",
    9: "혁명과 판도 뒤집기",
    10: "영원한 소년소녀의 유토피아",
    11: "차가운 얼음왕국",
    12: "서번트 수호와 리더십",
    13: "피상적 평판의 가면",
    14: "지독한 인내와 지구력",
    15: "본질 파헤치기와 비평",
    16: "보편적 관용과 달관",
    17: "비선형적 천재성과 아웃사이더",
    18: "숨 막히는 강박과 마이크로 매니징",
    19: "카르마적 희생과 연민",
    20: "독고다이 평행선",
}

ASPECT_OVERRIDE = {
    "Opposition": 15,
    "Square": 11,
    "Trine": 1,
}

LAYER3_DEFAULTS = {8, 16}

_MATRIX_PATH = os.path.join(os.path.dirname(__file__), "matrix4d.json")


def _load_matrix() -> dict:
    with open(_MATRIX_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


MATRIX_4D = _load_matrix()

MANUAL_OVERRIDE: dict[tuple[int, int], int] = {}


def _layer1_manual(user_pid: int, partner_pid: int) -> Optional[int]:
    return MANUAL_OVERRIDE.get((user_pid, partner_pid))


def _layer2_matrix(
    user_elem: str, partner_elem: str, user_mod: str, partner_mod: str
) -> int:
    return MATRIX_4D[user_elem][partner_elem][user_mod][partner_mod]


def _layer3_aspect(rel_type_id: int, user_pid: int, partner_pid: int) -> int:
    if rel_type_id not in LAYER3_DEFAULTS:
        return rel_type_id
    aspect = calculate_aspect(user_pid, partner_pid)
    if aspect and aspect in ASPECT_OVERRIDE:
        return ASPECT_OVERRIDE[aspect]
    return rel_type_id


def _layer4_fallback(user_elem: str, partner_elem: str) -> int:
    return 8 if user_elem == partner_elem else 16


def get_compatibility(
    user_birth: tuple[int, int, int],
    partner_birth: tuple[int, int, int],
) -> dict:
    user = birthdate_to_period(*user_birth)
    partner = birthdate_to_period(*partner_birth)

    if user["period_id"] == partner["period_id"]:
        return {
            "user": user,
            "partner": partner,
            "relationship_type_id": 10,
            "relationship_title": "같은 48주간 · 영원한 소년소녀의 유토피아",
            "determined_by": "SamePeriod",
        }

    rel_id = None
    layer_used = None

    try:
        rel_id = _layer1_manual(user["period_id"], partner["period_id"])
        if rel_id is not None:
            layer_used = "Layer1:ManualOverride"
        else:
            rel_id = _layer2_matrix(
                user["element"],
                partner["element"],
                user["modality"],
                partner["modality"],
            )
            layer_used = "Layer2:Matrix4D"
            corrected = _layer3_aspect(rel_id, user["period_id"], partner["period_id"])
            if corrected != rel_id:
                rel_id = corrected
                layer_used = "Layer3:AspectOverride"
    except Exception as e:
        rel_id = _layer4_fallback(user["element"], partner["element"])
        layer_used = f"Layer4:Fallback (error={e})"

    return {
        "user": user,
        "partner": partner,
        "relationship_type_id": rel_id,
        "relationship_title": RELATIONSHIP_TYPES.get(rel_id, "알 수 없음"),
        "determined_by": layer_used,
    }


if __name__ == "__main__":
    test_pairs = [
        ((1990, 4, 5), (1985, 12, 28)),
        ((1995, 10, 31), (1992, 8, 10)),
    ]
    for ub, pb in test_pairs:
        r = get_compatibility(ub, pb)
        print(ub, pb, "→", r["relationship_type_id"], r["relationship_title"], r["determined_by"])
