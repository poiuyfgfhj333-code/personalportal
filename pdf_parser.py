import os
import re
import pypdf
from typing import Dict, Any, List

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def extract_course_title(full_text: str, filename: str) -> str:
    # 1. Check in PDF text for explicit "교과목명"
    # e.g., "교과목명 고령사회와복지기술 학수번호 A11602 분반 001"
    # e.g., "교과목명 의공학프로그래밍및실습 학수번호 108205 분반 101"
    m_text = re.search(r'교과목명\s+([가-힣A-Za-z0-9_\(\)\s]+?)(?:\s+학수번호|\s+분반|\s+개설|\n|$)', full_text)
    if m_text:
        cand = clean_text(m_text.group(1))
        if cand and len(cand) >= 2 and not any(k in cand for k in ["학수번호", "분반", "강의계획서"]):
            return cand

    # Pattern with colon: "교과목명 : 의공생화학"
    m_colon = re.search(r'(?:교과목명|교\s*과\s*목\s*명|과목명|과\s*목\s*명|강좌명)\s*[:：\s]\s*([^\n\r\|/]+)', full_text)
    if m_colon:
        cand = clean_text(m_colon.group(1))
        if cand and len(cand) < 50 and not any(k in cand for k in ["강의계획서", "수강신청", "학점", "강의내용", "강의방식"]):
            return cand

    # 2. Extract from filename:
    # e.g. "1ad6e4cd_강의계획서_고령사회와복지기술.pdf" -> "고령사회와복지기술"
    # e.g. "b6f613af_강의계획서_의공학프로그래밍및실습.pdf" -> "의공학프로그래밍및실습"
    # e.g. "(2026-2학기) 의공생화학_20260902_1주차..." -> "의공생화학"
    base_name = os.path.splitext(os.path.basename(filename))[0]
    # Remove hex uuid prefix (e.g. 1ad6e4cd_)
    clean_base = re.sub(r'^[a-f0-9]{8}_', '', base_name)
    clean_base = re.sub(r'^\(\d{4}[-_]\d학기\)\s*', '', clean_base)
    clean_base = re.sub(r'^강의계획서_', '', clean_base)
    clean_base = re.sub(r'_강의계획서.*', '', clean_base)
    clean_base = re.sub(r'강의계획서|실라버스|syllabus', '', clean_base, flags=re.IGNORECASE)
    parts = re.split(r'[_,\-\(\)\[\]]', clean_base)
    for p in parts:
        p = clean_text(p)
        if p and len(p) >= 2 and not re.match(r'^\d+$', p) and not any(k in p for k in ["오리엔테이션", "주차", "강의자료", "강의내용"]):
            return p

    return clean_base.strip() or "신규 강의"

def extract_professor(full_text: str) -> str:
    # e.g., "담당교수 오영삼\n연구실" or "담당교수 이명기\n연구실"
    m = re.search(r'담당교수\s+([가-힣A-Za-z\s]{2,10}?)(?:\s+연구실|\s+이메일|\s+연락처|\n|$)', full_text)
    if m:
        cand = clean_text(m.group(1))
        if cand and not any(k in cand for k in ["연구실", "이메일", "연락처", "학점"]):
            return cand

    patterns = [
        r'(?:담당교수|담\s*당\s*교\s*수|교수명|담당교원|책임교수)\s*[:：\s]\s*([가-힣a-zA-Z\s]{2,15})(?:\s*\(|[,\n\r\t]|$)',
        r'Professor\s*[:：\s]\s*([a-zA-Z가-힣\s]{2,20})',
        r'교\s*수\s*[:：\s]\s*([가-힣a-zA-Z\s]{2,15})'
    ]
    for pattern in patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            prof = clean_text(match.group(1))
            if prof and not any(k in prof for k in ["연구실", "이메일", "전화번호", "학점"]):
                return prof
    return "미지정"

def extract_classroom(full_text: str) -> str:
    # e.g., "강의시간 목11,12,13 강의실 C25-634 강의형태 대면 수업" -> C25-634
    # e.g., "강의시간 화6,7 수2,3 강의실 A12-216 강의형태 대면 수업" -> A12-216
    m = re.search(r'강의실\s+([A-Za-z0-9\-]+|[가-힣0-9\s]+관\s*[0-9\-]+(?:호|실)?)(?:\s+강의형태|\s+강의시간|\n|$)', full_text)
    if m:
        cand = clean_text(m.group(1))
        if cand and len(cand) < 30 and not any(k in cand for k in ["강의형태", "대면", "수업"]):
            return cand

    patterns = [
        r'(?:강의실(?:위치)?|강의장소|수업장소|강\s*의\s*실)\s*[:：\s]\s*([^\n\r\|]+)',
        r'Classroom\s*[:：\s]\s*([^\n\r\|]+)',
        r'장소\s*[:：\s]\s*([^\n\r\|]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            room = clean_text(match.group(1))
            if room and len(room) < 50 and not any(k in room for k in ["담당교수", "수업시간"]):
                return room

    match = re.search(r'([가-힣A-Za-z0-9]+관\s*[B0-9\-]+(?:호|실)?)', full_text)
    if match:
        return clean_text(match.group(1))

    return "미지정"

def extract_class_time(full_text: str) -> str:
    # e.g., "강의시간 목11,12,13 강의실 C25-634" -> 목11,12,13
    # e.g., "강의시간 화6,7 수2,3 강의실 A12-216" -> 화6,7 수2,3
    m = re.search(r'강의시간\s+([월화수목금토일][\d\s,~월화수목금토일]+?)(?:\s+강의실|\s+강의형태|\n|$)', full_text)
    if m:
        cand = clean_text(m.group(1))
        if cand and len(cand) < 40 and not any(k in cand for k in ["강의실", "강의형태"]):
            return cand

    patterns = [
        r'(?:강의시간|수업시간|수업요일|요일\s*및\s*교시|강\s*의\s*시\s*간)\s*[:：\s]\s*([^\n\r\|]+)',
        r'Class\s*Time\s*[:：\s]\s*([^\n\r\|]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            ctime = clean_text(match.group(1))
            if ctime and len(ctime) < 60:
                return ctime

    match = re.search(r'([월화수목금토일]\s*(?:요일)?\s*[\d\s,~]+교시(?:\s*,\s*[월화수목금토일]\s*[\d\s,~]+교시)?)', full_text)
    if match:
        return clean_text(match.group(1))

    time_match = re.search(r'([월화수목금토일]\s*\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2}(?:\s*,\s*[월화수목금토일]\s*\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2})?)', full_text)
    if time_match:
        return clean_text(time_match.group(1))

    return "미지정"

def extract_grading(full_text: str) -> Dict[str, Any]:
    """
    Requirement 2:
    - Extract grading categories and percentage values.
    - Remove all 0% items!
    - Sort remaining items in descending order of percentage.
    - Provide icon metadata for each item.
    """
    items = []

    # Table format:
    # 구분 중간고사 기말고사 과제 토론 퀴즈 출결 기타 합계 성적평가기준
    # 평가비율 0% 0% 90% 0% 0% 0% 10% 100% 절대평가
    eval_match = re.search(r'구분\s+([^\n]+).*?평가비율\s+([^\n]+)', full_text, re.DOTALL)
    if eval_match:
        cats_line = eval_match.group(1).strip()
        vals_line = eval_match.group(2).strip()
        cats = [c.strip() for c in cats_line.split() if c not in ['합계', '성적평가기준', '평가비율', '구분']]
        vals = [v.strip() for v in vals_line.split() if '%' in v or v.isdigit()]
        for c, v in zip(cats, vals):
            m_pct = re.search(r'(\d+)', v)
            if m_pct:
                pct = int(m_pct.group(1))
                if pct > 0:
                    items.append({
                        "category": c,
                        "percentage": pct,
                        "value": f"{pct}%"
                    })

    # If table format not matched or empty, try pattern matches
    if not items:
        cand_patterns = [
            (r'중간(?:고사|평가)?\s*[:：\s]*(\d{1,3})\s*%', '중간고사'),
            (r'기말(?:고사|평가)?\s*[:：\s]*(\d{1,3})\s*%', '기말고사'),
            (r'(?:과제|레포트|보고서|숙제)\s*[:：\s]*(\d{1,3})\s*%', '과제'),
            (r'출(?:석|결)\s*[:：\s]*(\d{1,3})\s*%', '출결'),
            (r'(?:토론)\s*[:：\s]*(\d{1,3})\s*%', '토론'),
            (r'(?:퀴즈)\s*[:：\s]*(\d{1,3})\s*%', '퀴즈'),
            (r'(?:기타|참여도|태도)\s*[:：\s]*(\d{1,3})\s*%', '기타/참여도')
        ]
        for pat, cat in cand_patterns:
            m = re.search(pat, full_text)
            if m:
                pct = int(m.group(1))
                if pct > 0:
                    items.append({
                        "category": cat,
                        "percentage": pct,
                        "value": f"{pct}%"
                    })

    # Remove duplicates & sort descending by percentage
    unique_items = []
    seen = set()
    for it in items:
        if it["category"] not in seen:
            seen.add(it["category"])
            unique_items.append(it)

    unique_items.sort(key=lambda x: x["percentage"], reverse=True)

    # Assign icons and badges
    for it in unique_items:
        cat = it["category"]
        if "중간" in cat:
            it["icon"] = "edit-3"
            it["color"] = "text-blue-400 border-blue-500/30 bg-blue-500/10"
        elif "기말" in cat:
            it["icon"] = "trophy"
            it["color"] = "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
        elif "과제" in cat:
            it["icon"] = "folder-check"
            it["color"] = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
        elif "출" in cat:
            it["icon"] = "user-check"
            it["color"] = "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
        elif "토론" in cat:
            it["icon"] = "message-square"
            it["color"] = "text-purple-400 border-purple-500/30 bg-purple-500/10"
        elif "퀴즈" in cat:
            it["icon"] = "zap"
            it["color"] = "text-amber-400 border-amber-500/30 bg-amber-500/10"
        else:
            it["icon"] = "bookmark"
            it["color"] = "text-slate-300 border-slate-700 bg-slate-800/40"

    summary = ", ".join([f"{it['category']} {it['value']}" for it in unique_items]) if unique_items else "평가 비율 미지정"

    return {
        "items": unique_items,
        "summary": summary
    }

def extract_weekly_syllabus(full_text: str) -> List[Dict[str, str]]:
    """
    Requirement 3:
    Extract 4 columns:
    1. 주차 (week)
    2. 강의주제 (topic)
    3. 상세 강의내용 (content)
    4. 과제 및 기타 참고사항 (remarks)
    """
    results = []

    # 1. Search for PKNU standard table:
    # "주별 강의주제 상세 강의내용 과제 및 기타 참고사항"
    table_match = re.search(r'주별\s*강의주제\s*상세\s*강의내용.*?(?=4\.\s*주별강의|※\s*참고사항|$)', full_text, re.DOTALL)
    if table_match:
        content = table_match.group(0)
        lines = [l.strip() for l in content.splitlines() if l.strip()][1:]
        
        weeks = {}
        cur_w = None
        buf = []
        for line in lines:
            # check if line starts with 1..16
            m = re.match(r'^(\d{1,2})(?:\s+(.*))?$', line)
            if m and 1 <= int(m.group(1)) <= 16:
                if cur_w is not None:
                    weeks[cur_w] = buf
                cur_w = int(m.group(1))
                buf = [m.group(2).strip()] if m.group(2) else []
            else:
                if cur_w is not None:
                    buf.append(line)
        if cur_w is not None:
            weeks[cur_w] = buf

        for w_num in sorted(weeks.keys()):
            row_lines = weeks[w_num]
            raw_text = ' '.join(row_lines).strip()

            # Separate remarks (과제 및 기타 참고사항)
            remarks = '-'
            m_rem = re.search(r'(선수학습\s*동영상(?:,\s*과제)?|과제(?:\s*제출)?)$', raw_text)
            if m_rem:
                remarks = m_rem.group(0).strip()
                raw_text = raw_text[:m_rem.start()].strip()

            topic = ''
            detail = ''

            if len(row_lines) > 1:
                topic_parts = []
                detail_parts = []
                switched = False
                for l in row_lines:
                    if m_rem and m_rem.group(0) in l:
                        l = l.replace(m_rem.group(0), '').strip()
                    if not l:
                        continue
                    if not switched and (len(l) > 18 or ',' in l or any(k in l for k in ['소개', '개념', '실습', '평가', '복잡성 1', '복잡성 2', '스마트홈', '개인정보', '원격', '제작', 'LMS'])):
                        if topic_parts:
                            switched = True
                    if switched:
                        detail_parts.append(l)
                    else:
                        topic_parts.append(l)

                topic = ' '.join(topic_parts).strip()
                detail = ' '.join(detail_parts).strip()
            else:
                if raw_text.count('중간고사') >= 2 or raw_text == '중간고사':
                    topic = '중간고사'
                    detail = '중간고사 지필평가'
                elif raw_text.count('기말고사') >= 2 or raw_text == '기말고사':
                    topic = '기말고사'
                    detail = '기말고사 지필평가'
                elif ',' in raw_text:
                    parts = raw_text.split(',', 1)
                    topic = parts[0].strip()
                    detail = parts[1].strip()
                else:
                    topic = raw_text
                    detail = '-'

            # Normalize spacing for broken Korean words
            topic = re.sub(r'([가-힣])\s+([가-힣])(?=[가-힣])', r'\1\2', topic)
            detail = re.sub(r'([가-힣])\s+([가-힣])(?=[가-힣])', r'\1\2', detail)
            if topic in ['기말평']: topic = '기말평가'
            if topic in ['중간평']: topic = '중간평가'
            if not detail: detail = '-'

            results.append({
                "week": f"{w_num}주차",
                "topic": topic or f"{w_num}주차 강의",
                "content": detail,
                "remarks": remarks
            })

    # 2. Fallback: line-by-line matching for standard "1주차 (09/02) ..." format
    if not results:
        lines = full_text.splitlines()
        for line in lines:
            line = line.strip()
            m = re.match(r'^(?:\[?(\d{1,2})주(?:차)?\]?|Week\s*(\d{1,2}))\s*(.*)', line, re.IGNORECASE)
            if m:
                week_num = int(m.group(1) or m.group(2))
                rest = m.group(3).strip()
                
                # Check for remarks
                remarks = '-'
                if " - " in rest:
                    parts = rest.split(" - ", 1)
                    title_content = parts[0].strip()
                    remarks = parts[1].strip()
                else:
                    title_content = rest

                words = title_content.split(maxsplit=2)
                if len(words) >= 2:
                    topic = f"{words[0]} {words[1]}"
                    detail = words[2] if len(words) > 2 else "-"
                else:
                    topic = title_content
                    detail = "-"

                results.append({
                    "week": f"{week_num}주차",
                    "topic": topic,
                    "content": detail,
                    "remarks": remarks
                })

    # 3. If still empty, create standard 15-week outline
    if not results:
        for w in range(1, 16):
            w_title = "강의 소개 및 오리엔테이션" if w == 1 else ("중간고사" if w == 8 else ("기말고사" if w == 15 else f"제 {w}주차 강의 주제"))
            results.append({
                "week": f"{w}주차",
                "topic": w_title,
                "content": "세부 학습 계획 참조",
                "remarks": "-"
            })

    return results

def parse_syllabus_pdf(file_path: str, original_filename: str = None) -> Dict[str, Any]:
    full_text = ""
    try:
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            t = page.extract_text()
            if t:
                full_text += t + "\n"
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")

    effective_filename = original_filename or os.path.basename(file_path)
    title = extract_course_title(full_text, effective_filename)
    professor = extract_professor(full_text)
    classroom = extract_classroom(full_text)
    class_time = extract_class_time(full_text)
    grading = extract_grading(full_text)
    weekly = extract_weekly_syllabus(full_text)

    return {
        "title": title,
        "professor": professor,
        "classroom": classroom,
        "class_time": class_time,
        "grading": grading,
        "weekly": weekly,
        "original_filename": effective_filename
    }
