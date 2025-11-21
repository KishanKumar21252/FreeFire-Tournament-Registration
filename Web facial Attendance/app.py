from flask import Flask, request, jsonify, send_file
import face_recognition
import numpy as np
import cv2
import base64
import io
from datetime import datetime
from PIL import Image
import csv
import os

app = Flask(__name__)

ATTENDANCE_FILE = "Web facial Attendance/attendance.csv"

def log_attendance(record):
    file_exists = os.path.isfile(ATTENDANCE_FILE)
    with open(ATTENDANCE_FILE, "a", newline="") as csvfile:
        fieldnames = ["ID", "Name", "Status", "Timestamp"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()
        writer.writerow(record)

# Load known faces (put student images in a folder "students/")
known_encodings = []
known_names = []

# Example: load student images
students = {
    "S123": "students/john_doe.jpg",
    "S124": "students/jane_smith.jpg"
}

for sid, path in students.items():
    img = face_recognition.load_image_file(path)
    enc = face_recognition.face_encodings(img)[0]
    known_encodings.append(enc)
    known_names.append({"id": sid, "name": path.split("/")[-1].replace(".jpg","")})

@app.route("/recognize", methods=["POST"])
def recognize():
    data = request.get_json()
    img_data = data["image"].split(",")[1]  # remove base64 prefix
    img_bytes = base64.b64decode(img_data)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    frame = np.array(img)

    # Detect face encodings
    face_locations = face_recognition.face_locations(frame)
    encodings = face_recognition.face_encodings(frame, face_locations)

    results = []
    for encoding in encodings:
        matches = face_recognition.compare_faces(known_encodings, encoding)
        face_distances = face_recognition.face_distance(known_encodings, encoding)
        best_match = np.argmin(face_distances)

        if matches[best_match]:
            sid = known_names[best_match]["id"]
            name = known_names[best_match]["name"]
            record = {
                "ID": sid,
                "Name": name,
                "Status": "Marked",
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            log_attendance(record)
            results.append(record)
        else:
            record = {
                "ID": "Unknown",
                "Name": "Unknown",
                "Status": "Unrecognized",
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            log_attendance(record) # Log unrecognized faces too, for auditing
            results.append(record)

    return jsonify(results)

@app.route("/download_attendance", methods=["GET"])
def download_attendance():
    if os.path.exists(ATTENDANCE_FILE):
        return send_file(ATTENDANCE_FILE, as_attachment=True, download_name="attendance.csv")
    else:
        return "Attendance file not found.", 404

if __name__ == "__main__":
    app.run(debug=True)
