import subprocess
import time
from threading import Timer

def run(cmd, timeout_sec):
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    timer = Timer(timeout_sec, proc.kill)
    try:
        timer.start()
        stdout,stderr = proc.communicate()
    finally:
        timer.cancel()
    return stdout


def IsAdbHung():
    out = run(['adb', 'devices'], 60)
    return len(out) == 0


def KillAdb():
    import psutil
    print("adb is hung, restarting...")
    for proc in psutil.process_iter():
        if proc.name() == "adb.exe":
            proc.kill()


def SetAdbAffinity():
    import psutil
    for proc in psutil.process_iter():
        if proc.name() == "adb.exe":
            proc.cpu_affinity([0])


def main():
    try:
        import psutil
    except:
        print("psutil is required")
        exit()

    print("Monitoring adb for hangs...")
    try:
        IsAdbHung()
        SetAdbAffinity()
        while True:
            if IsAdbHung():
                KillAdb()
                IsAdbHung()
                SetAdbAffinity()
            time.sleep(60)
    except KeyboardInterrupt:
        print("Exiting...")


if '__main__' == __name__:
    main()
