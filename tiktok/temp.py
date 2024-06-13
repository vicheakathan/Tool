import argparse
from tls_client import Session, response
from colorama import Fore, init
from bs4 import BeautifulSoup
from random import randint
import subprocess
import requests
import os
import re

init(autoreset=True)

class SnapTikReversed:
    def __init__(self, userAgent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'):
        self.userAgent = userAgent
        self.client = Session(client_identifier='chrome_109')
        self.token = self.get_token()
        self.base = []
        self.url = ""

    def get_token(self) -> response:
        try:
            response = self.client.get("https://snaptik.app")
            soup = BeautifulSoup(response.text, "lxml")
            for _input in soup.find_all("input"):
                if _input.get("name") == "token":
                    self.token = _input.get("value")
            return self.token
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return None

    def send_request(self, video: str) -> response:
        try:
            headers = {
                'authority': 'snaptik.app',
                'accept': '*/*',
                'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
                'dnt': '1',
                'origin': 'https://snaptik.app',
                'referer': 'https://snaptik.app/',
                'sec-ch-ua': '"Opera";v="99", "Chromium";v="113", "Not-A.Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin'
            }
            response = self.client.get('https://snaptik.app/abc2.php', headers=headers, params={
                'url': video,
                'token': self.token
            })
            _var = re.findall(r'\(\".*?,.*?,.*?,.*?,.*?.*?\)', response.text)
            self.base = []
            for e in (_var[0].split(",")):
                self.base.append(str(e).replace("(", "").replace(")", "").replace('"', ""))
            return self.base
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return None

    def decode(self, variable: list):
        try:
            output = subprocess.check_output([
                'node', 'tiktok/decode.py',
                str(variable[0]), str(variable[1]), str(variable[2]), str(variable[3]), str(variable[4]), str(variable[5])
            ])
            result = (output).decode("utf-8")
            return result
        except Exception as e:
            print(f"Decode error: {e}")
            return None
   
    def get_video(self, video: str, _path: str=None) -> response:
        try:
            _page = self.send_request(video)
            _page = self.decode(_page)
            soup = BeautifulSoup(_page, "lxml")

            for a in soup.find_all("a"):
                url = a.get("href")
                url = str(url).replace('\\', "").replace('"', "")
                # print(url)
                if "snaptik" in url:
                    self.url = url
        
            response = requests.get(self.url)
            id = f"{randint(1000000, 9999999)}.mp4"

            if _path:
                file_path = os.path.join(_path, id)
            else:
                file_path = id

            with open(file_path, "wb") as file:
                file.write(response.content)

            return f">> [{Fore.GREEN}{video}{Fore.RESET}] success | {file_path}"
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return None
        

def main():
    video_url = 'https://www.tiktok.com/@anttonraccaus/video/7279062551613246752'

    snaptik_instance = SnapTikReversed()
    result = snaptik_instance.get_video(video_url)

    if result:
        print(result)
    else:
        print("Failed to download the video.")

if __name__ == '__main__':
    main()