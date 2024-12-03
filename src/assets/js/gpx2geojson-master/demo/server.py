#!/usr/bin/python3
from flask import Flask, send_from_directory

app = Flask(__name__)

@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def send_report(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(host='127.0.0.1')
