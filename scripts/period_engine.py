"""
팔자연구소 - Period Engine
생년월일 → 태양 황도 경도 → Period_ID (01~48) 변환

의존: ephem (pip install ephem)
"""

import ephem
import math
from datetime import date
from typing import Optional

# ── 48주기 마스터 테이블 ──────────────────────────────────────────
PERIOD_MASTER = [
    (1, "물고기-양 쿠스프", "Water", "Mutable", 356.00, 364.00),
    (2, "양자리 I", "Fire", "Cardinal", 4.00, 11.33),
    (3, "양자리 II", "Fire", "Cardinal", 11.33, 18.66),
    (4, "양자리 III", "Fire", "Cardinal", 18.66, 26.00),
    (5, "양-황소 쿠스프", "Earth", "Fixed", 26.00, 34.00),
    (6, "황소자리 I", "Earth", "Fixed", 34.00, 41.33),
    (7, "황소자리 II", "Earth", "Fixed", 41.33, 48.66),
    (8, "황소자리 III", "Earth", "Fixed", 48.66, 56.00),
    (9, "황소-쌍둥이 쿠스프", "Air", "Mutable", 56.00, 64.00),
    (10, "쌍둥이자리 I", "Air", "Mutable", 64.00, 71.33),
    (11, "쌍둥이자리 II", "Air", "Mutable", 71.33, 78.66),
    (12, "쌍둥이자리 III", "Air", "Mutable", 78.66, 86.00),
    (13, "쌍둥이-게 쿠스프", "Water", "Cardinal", 86.00, 94.00),
    (14, "게자리 I", "Water", "Cardinal", 94.00, 101.33),
    (15, "게자리 II", "Water", "Cardinal", 101.33, 108.66),
    (16, "게자리 III", "Water", "Cardinal", 108.66, 116.00),
    (17, "게-사자 쿠스프", "Fire", "Fixed", 116.00, 124.00),
    (18, "사자자리 I", "Fire", "Fixed", 124.00, 131.33),
    (19, "사자자리 II", "Fire", "Fixed", 131.33, 138.66),
    (20, "사자자리 III", "Fire", "Fixed", 138.66, 146.00),
    (21, "사자-처녀 쿠스프", "Earth", "Mutable", 146.00, 154.00),
    (22, "처녀자리 I", "Earth", "Mutable", 154.00, 161.33),
    (23, "처녀자리 II", "Earth", "Mutable", 161.33, 168.66),
    (24, "처녀자리 III", "Earth", "Mutable", 168.66, 176.00),
    (25, "처녀-천칭 쿠스프", "Air", "Cardinal", 176.00, 184.00),
    (26, "천칭자리 I", "Air", "Cardinal", 184.00, 191.33),
    (27, "천칭자리 II", "Air", "Cardinal", 191.33, 198.66),
    (28, "천칭자리 III", "Air", "Cardinal", 198.66, 206.00),
    (29, "천칭-전갈 쿠스프", "Water", "Fixed", 206.00, 214.00),
    (30, "전갈자리 I", "Water", "Fixed", 214.00, 221.33),
    (31, "전갈자리 II", "Water", "Fixed", 221.33, 228.66),
    (32, "전갈자리 III", "Water", "Fixed", 228.66, 236.00),
    (33, "전갈-사수 쿠스프", "Fire", "Mutable", 236.00, 244.00),
    (34, "사수자리 I", "Fire", "Mutable", 244.00, 251.33),
    (35, "사수자리 II", "Fire", "Mutable", 251.33, 258.66),
    (36, "사수자리 III", "Fire", "Mutable", 258.66, 266.00),
    (37, "사수-염소 쿠스프", "Earth", "Cardinal", 266.00, 274.00),
    (38, "염소자리 I", "Earth", "Cardinal", 274.00, 281.33),
    (39, "염소자리 II", "Earth", "Cardinal", 281.33, 288.66),
    (40, "염소자리 III", "Earth", "Cardinal", 288.66, 296.00),
    (41, "염소-물병 쿠스프", "Air", "Fixed", 296.00, 304.00),
    (42, "물병자리 I", "Air", "Fixed", 304.00, 311.33),
    (43, "물병자리 II", "Air", "Fixed", 311.33, 318.66),
    (44, "물병자리 III", "Air", "Fixed", 318.66, 326.00),
    (45, "물병-물고기 쿠스프", "Water", "Mutable", 326.00, 334.00),
    (46, "물고기자리 I", "Water", "Mutable", 334.00, 341.33),
    (47, "물고기자리 II", "Water", "Mutable", 341.33, 348.66),
    (48, "물고기자리 III", "Water", "Mutable", 348.66, 356.00),
]

PERIOD_BY_ID = {
    p[0]: {"period_id": p[0], "name": p[1], "element": p[2], "modality": p[3], "start": p[4], "end": p[5]}
    for p in PERIOD_MASTER
}


def get_sun_longitude(year: int, month: int, day: int) -> float:
    sun = ephem.Sun()
    sun.compute(f"{year}/{month}/{day} 12:00:00", epoch=ephem.J2000)
    ecl = ephem.Ecliptic(sun, epoch=ephem.J2000)
    lon = float(ecl.lon) * (180.0 / math.pi)
    return lon % 360.0


def get_period_from_longitude(lon: float) -> dict:
    if lon >= 356.0 or lon < 4.0:
        p = PERIOD_MASTER[0]
    else:
        p = next((x for x in PERIOD_MASTER[1:] if x[4] <= lon < x[5]), None)
        if p is None:
            p = next(
                (x for x in PERIOD_MASTER[1:] if x[4] <= lon + 0.01 < x[5]),
                PERIOD_MASTER[0],
            )
    return {
        "period_id": p[0],
        "name": p[1],
        "element": p[2],
        "modality": p[3],
        "sun_longitude": round(lon, 2),
    }


def birthdate_to_period(year: int, month: int, day: int) -> dict:
    lon = get_sun_longitude(year, month, day)
    return get_period_from_longitude(lon)


def get_period_center_degree(period_id: int) -> float:
    p = PERIOD_BY_ID[period_id]
    if period_id == 1:
        return 0.0
    return (p["start"] + p["end"]) / 2.0


def calculate_aspect(period_id_a: int, period_id_b: int) -> Optional[str]:
    ca = get_period_center_degree(period_id_a)
    cb = get_period_center_degree(period_id_b)
    delta = abs(ca - cb)
    if delta > 180.0:
        delta = 360.0 - delta
    if 177.5 <= delta <= 182.5:
        return "Opposition"
    if 87.5 <= delta <= 92.5:
        return "Square"
    if 117.5 <= delta <= 122.5:
        return "Trine"
    return None


if __name__ == "__main__":
    test_cases = [
        (1990, 4, 5, "양자리 II"),
        (1985, 12, 28, "염소자리 I"),
        (1993, 3, 20, "물고기-양"),
        (1988, 7, 23, "게-사자"),
        (2000, 1, 15, "염소자리 II"),
        (1995, 10, 31, "전갈자리 I"),
    ]
    for y, m, d, label in test_cases:
        r = birthdate_to_period(y, m, d)
        ok = label.split()[0] in r["name"]
        print(f"{'OK' if ok else 'NG'} {y}-{m:02d}-{d:02d} → {r['period_id']:02d} {r['name']} ({r['sun_longitude']}°)")
