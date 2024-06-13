import argparse
import os

from temp import SnapTikReversed

def main():

    snaptik_instance = SnapTikReversed()
    # sanitized_urls = snaptik_instance.get_video()
    arser = argparse.ArgumentParser(description="SnapTikReversed CLI")
    parser.add_argument("video_url", type=str, help="URL of the video to download")

    args = parser.parse_args()
    video_url = args.video_url

    snaptik_instance = SnapTikReversed()
    result = snaptik_instance.get_video(video_url)

    if result:
        print(result)
    else:
        print("Failed to download the video.")

if __name__ == '__main__':
    main()