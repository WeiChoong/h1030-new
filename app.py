from flask import Flask, render_template, request, jsonify, send_from_directory
from models import db, Article, Task
from datetime import datetime, timedelta, timezone
taiwan_tz = timezone(timedelta(hours=8))
import calendar
import os
import requests

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///calendar_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# ===================================
# Helper: weather mapping + fetcher
# ===================================
# 將天氣狀態對映到本地動畫檔名（放在 static/weather/）
WEATHER_TO_ANIM = {
    "Sunny": "sunny.mp4",
    "Clear": "sunny.mp4",
    "Partly cloudy": "cloudy.mp4",
    "Cloudy": "cloudy.mp4",
    "Overcast": "cloudy.mp4",
    "Rain": "rainy.mp4",
    "Light rain": "rainy.mp4",
    "Showers": "rainy.mp4"
}

def get_local_weather():
    """
    嘗試從 wttr.in 取得簡單當日天氣（免 key），若失敗則回傳 mock。
    如需改用 Google 天氣，需替換此邏輯並處理授權/條款。
    """
    try:
        r = requests.get("http://wttr.in/?format=j1", timeout=4)
        j = r.json()
        # j['current_condition'][0]['weatherDesc'][0]['value'] 例如 "Light rain"
        cc = j.get('current_condition', [{}])[0]
        desc = cc.get('weatherDesc', [{}])[0].get('value', 'Clear')
        temp_c = cc.get('temp_C', None)
        anim = None
        # 嘗試 match mapping key 的一個近似 (contains)
        for k in WEATHER_TO_ANIM:
            if k.lower() in desc.lower():
                anim = WEATHER_TO_ANIM[k]
                break
        if anim is None:
            anim = WEATHER_TO_ANIM['Clear']
        return {"desc": desc, "temp_c": temp_c, "anim": anim}
    except Exception as e:
        # fallback mock
        return {"desc": "Clear", "temp_c": "25", "anim": WEATHER_TO_ANIM['Clear']}

# ===================================
# 初始化 DB（第一次執行）
# ===================================
with app.app_context():
    db.create_all()


# ===================================
# 前端頁面
# ===================================
@app.route('/')
def index():
    # 統一使用台灣時區
    now = datetime.now(taiwan_tz)
    year = request.args.get('year', now.year, type=int)
    month = request.args.get('month', now.month, type=int)

    cal = calendar.Calendar(firstweekday=6)  # 星期日為每週起始
    month_days = cal.monthdatescalendar(year, month)  # 每週 list，日期為 datetime.date

    tasks = [t.to_dict() for t in Task.query.order_by(Task.deadline.asc().nulls_last(), Task.created_at.desc()).all()]
    weather = get_local_weather()

    return render_template(
        'calendar.html',
        year=year,
        month=month,
        days=month_days,   # 改名稱，更直觀
        tasks=tasks,
        today=now.date(),  # 傳 datetime.date
        weather=weather
    )

# ===================================
# Task API (簡單) - 用於前端 add/list
# ===================================
@app.route('/api/tasks', methods=['GET', 'POST'])
def tasks_api():
    if request.method == 'GET':
        tasks = [t.to_dict() for t in Task.query.order_by(Task.deadline.asc().nulls_last(), Task.created_at.desc()).all()]
        return jsonify(tasks)
    else:
        data = request.get_json()
        name = data.get('name')
        deadline = data.get('deadline')  # 例如 "2025-11-01"
        category = data.get('category', 'Other')
        dt = None
        if deadline:
            try:
                dt = datetime.strptime(deadline, "%Y-%m-%d").date()
            except:
                dt = None
        t = Task(name=name, deadline=dt, category=category)
        db.session.add(t)
        db.session.commit()
        return jsonify(t.to_dict()), 201

# ===================================
# Article RESTful API（CRUD）
# ===================================
@app.route('/api/articles', methods=['GET', 'POST'])
def articles():
    if request.method == 'GET':
        articles = Article.query.order_by(Article.created_at.desc()).all()
        return jsonify([a.to_dict() for a in articles])
    else:  # POST create
        data = request.get_json()
        title = data.get('title')
        content = data.get('content', '')
        if not title:
            return jsonify({"error": "title required"}), 400
        a = Article(title=title, content=content)
        db.session.add(a)
        db.session.commit()
        return jsonify(a.to_dict()), 201

@app.route('/api/articles/<int:article_id>', methods=['GET', 'PUT', 'DELETE'])
def article_detail(article_id):
    a = Article.query.get_or_404(article_id)
    if request.method == 'GET':
        return jsonify(a.to_dict())
    elif request.method == 'PUT':
        data = request.get_json()
        a.title = data.get('title', a.title)
        a.content = data.get('content', a.content)
        db.session.commit()
        return jsonify(a.to_dict())
    else:  # DELETE
        db.session.delete(a)
        db.session.commit()
        return jsonify({"message": "deleted"}), 200

# 靜態檔案（Flask 會自動服務 static/，此 route 非必須）
@app.route('/static/weather/<path:filename>')
def weather_static(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'weather'), filename)

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "deleted"}), 200


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)




