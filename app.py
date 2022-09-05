from flask import Flask, Blueprint, render_template, request, send_file, Response
from flask_bower import Bower
import io
from os import environ
import datetime
import string
import json
import sys
import base64
import os
import requests
import time 
import urllib.parse
import time 
import torch.backends.cudnn as cudnn

from datetime import datetime, timedelta

from azure.storage.blob import BlobServiceClient, ResourceTypes, ContainerClient, BlobClient, ContentSettings

from models.experimental import *
from utils.utils import *

views = Blueprint('views', __name__, template_folder='templates')

app = Flask(__name__)

Bower(app)

app.register_blueprint(views)

def reshape_image(img, new_shape=(640, 640), color=(114, 114, 114), auto=True, scaleFill=False, scaleup=True):
    # Resize image to a 32-pixel-multiple rectangle https://github.com/ultralytics/yolov3/issues/232
    shape = img.shape[:2]  # current shape [height, width]
    if isinstance(new_shape, int):
        new_shape = (new_shape, new_shape)

    # Scale ratio (new / old)
    r = min(new_shape[0] / shape[0], new_shape[1] / shape[1])
    if not scaleup:  # only scale down, do not scale up (for better test mAP)
        r = min(r, 1.0)

    # Compute padding
    ratio = r, r  # width, height ratios
    new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
    dw, dh = new_shape[1] - new_unpad[0], new_shape[0] - new_unpad[1]  # wh padding
    if auto:  # minimum rectangle
        dw, dh = np.mod(dw, 64), np.mod(dh, 64)  # wh padding
    elif scaleFill:  # stretch
        dw, dh = 0.0, 0.0
        new_unpad = (new_shape[1], new_shape[0])
        ratio = new_shape[1] / shape[1], new_shape[0] / shape[0]  # width, height ratios

    dw /= 2  # divide padding into 2 sides
    dh /= 2

    if shape[::-1] != new_unpad:  # resize
        img = cv2.resize(img, new_unpad, interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))

    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)  # add border

    return img, ratio, (dw, dh)

def transform_image(img0, h, w):
    # Padded resize
    img = reshape_image(img0, new_shape=(h, w))[0]

    # Convert
    img = img[:, :, ::-1].transpose(2, 0, 1)  # BGR to RGB, to 3x416x416
    img = np.ascontiguousarray(img)

    return img, img0

    ratio = r, r  # width, height ratios
    new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
    dw, dh = new_shape[1] - new_unpad[0], new_shape[0] - new_unpad[1]  # wh padding
    if auto:  # minimum rectangle
        dw, dh = np.mod(dw, 64), np.mod(dh, 64)  # wh padding
    elif scaleFill:  # stretch
        dw, dh = 0.0, 0.0
        new_unpad = (new_shape[1], new_shape[0])
        ratio = new_shape[1] / shape[1], new_shape[0] / shape[0]  # width, height ratios

    dw /= 2  # divide padding into 2 sides
    dh /= 2

    if shape[::-1] != new_unpad:  # resize
        img = cv2.resize(img, new_unpad, interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)  # add border

    return img, ratio, (dw, dh)

def load_image(buffer, augment):
    jpg_as_np = np.frombuffer(buffer, dtype=np.uint8)
    img = cv2.imdecode(jpg_as_np, flags=1)    
    h0, w0 = img.shape[:2]  # orig hw
    
    return img, (h0, w0), img.shape[:2]  # img, hw_original, hw_resized

def detect(model_buffer, buffer):
    # Initialize
    device = torch_utils.select_device('cpu')

    half = device.type != 'cpu'  # half precision only supported on CUDA

    # Load model
    model = attempt_load(model_buffer, map_location=device)  # load FP32 model
    
    # Get names and colors
    names = model.module.names if hasattr(model, 'module') else model.names

    log("[Analyze] Names : '%s'" % (names))

    t0 = time.time()

    image, (h0, w0), (h, w) = load_image(buffer, True)
    print("source: (%d, %d), (%d, %d)" % (h0, w0, h, w))

    img = torch.zeros((1, 3, h0, w0), device=device)  # init img
    _ = model(img.half() if half else img) if device.type != 'cpu' else None  # run once

    img, img0 = transform_image(image, h0, w0)
    img = torch.from_numpy(img).to(device)

    img = img.half() if half else img.float()  # uint8 to fp16/32
    img /= 255.0  # 0 - 255 to 0.0 - 1.0
    if img.ndimension() == 3:
       img = img.unsqueeze(0)

    # Inference
    t1 = torch_utils.time_synchronized()
    pred = model(img, augment=True)[0]

    # Apply NMS
    pred = non_max_suppression(pred, 0.4, 0.5, classes=None, agnostic=True)
    t2 = torch_utils.time_synchronized()

    boxes = []

    # Process detections
    for i, det in enumerate(pred):  # detections per image
        s, im0 = '', img0

        s += '%gx%g ' % img.shape[2:]  # print string
        gn = torch.tensor(im0.shape)[[1, 0, 1, 0]]  # normalization gain whwh

        if det is not None and len(det):
           # Rescale boxes from img_size to im0 size
           det[:, :4] = scale_coords(img.shape[2:], det[:, :4], im0.shape).round()

           # Print results
           for c in det[:, -1].unique():
               n = (det[:, -1] == c).sum()  # detections per class
               s += '%g %ss, ' % (n, names[int(c)])  # add to string

           # Write results
           for *xyxy, conf, cls in det:
                xywh = (xyxy2xywh(torch.tensor(xyxy).view(1, 4)) / gn).view(-1).tolist()  # normalized xywh
                print(('%g,' * 5 + '%f') % (cls, *xywh, conf))  # label format

                label = '%s %.2f' % (names[int(cls)], conf)
#                boxes.append(('%s,' + '%g,' * 5 + '%f') % (names[int(cls)], cls, *xywh, conf))

                boxes.append([int(cls), str(names[int(cls)]), float(xywh[0]),  float(xywh[1]), float(xywh[2]), float(xywh[3]), float(conf)])

    return {
        "boxes" : boxes 
    }

def log(message):
    message = "%s : %s " % (str(datetime.now()), message)
    print(message)

def root_dir():  # pragma: no cover
    return os.path.abspath(os.path.dirname(__file__))

def get_container_client(token, container):
    print("Token: %s, Container: %s" % (token, container))
    parts = token.split("/?")

    output = []

    credential = ("?%s" % (parts[1]))
    account_url=("%s/" % (parts[0]))
    
    blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)

    container_client = None

    try:
        container_client = blob_service_client.create_container(container)
 
    except Exception as e:
        print("create_container: " + str(e))
        container_client = blob_service_client.get_container_client(container)

    return container_client

@app.route("/query", methods=["GET"])
def query():
    try:
        token = request.values.get('token')  # The Datalake SAF token
        container = request.values.get('container')  # the Datalake Container
    
        container_client = get_container_client(token, container)

        output = []
        blobs = []

        blobs_list = container_client.list_blobs()

        for blob in blobs_list:
            print(blob.name + '\n')
            blobs.append(blob.name)

            output.append({
                "blobs" : blobs,
                "status": "OK"
            })

        return json.dumps(output, sort_keys=True), 200

    except Exception as e:
        print("query: " + str(e))

        output = []

        output.append({
            "code": 500,
            "messgae": str(e),
            "status": "FAIL"
        })

        return json.dumps(output, sort_keys=True), 500

@app.route("/retreive", methods=["GET"])
def retreive():
    token = request.values.get('token')  # The Datalake SAF token
    container = request.values.get('container')  # the Datalake Container
    blob = request.values.get('blob')  # the Datalake Blob
  
    print('[RETRIEVING] file %s' % (blob))

    container_client = get_container_client(token, container)
    blob_client = container_client.get_blob_client(blob)

    download_stream = blob_client.download_blob()

    if blob.endswith('.json'):
        return Response(io.BytesIO(download_stream.readall()), mimetype='text/json')
    else:
        return Response(io.BytesIO(download_stream.readall()), mimetype='image/jpg')

@app.route("/save", methods=["POST"])
def save():
    token = request.values.get('token')  # The Datalake SAF token
    container = request.values.get('container')  # the Datalake Container
    
    container_client = get_container_client(token, container)

    uploaded_files = request.files

    print('[UPLOADING] files %d' % (len(uploaded_files)))

    for uploaded_file in uploaded_files:

        print("[UPLOADING] File : '%s'" % (uploaded_file))

        fileContent = request.files.get(uploaded_file)

        blob_client = container_client.get_blob_client(uploaded_file)

        try:
            blob_client.delete_blob()
        except Exception as e:
            print("delete_blob: " + str(e))

        blob_client.upload_blob(fileContent)

    output = []

    output.append({
        "status": "OK"
    })

    return json.dumps(output, sort_keys=True), 200

@app.route("/apply", methods=["POST"])
def apply():
    token = request.values.get('token')  # The Datalake SAF token
    container = request.values.get('container')  # the Datalake Container
    model = request.values.get('model')  # the Model
    
    container_client = get_container_client(token, container)

    uploaded_files = request.files

    print('[APPLY] files %d' % (len(uploaded_files)))
    
    output = []

    for uploaded_file in uploaded_files:
        print("[APPLYING] File : '%s'" % (uploaded_file))
        blob_client = container_client.get_blob_client(model)

        download_stream = blob_client.download_blob()

        stream = io.BytesIO(download_stream.readall())

        fileContent = request.files.get(uploaded_file)

        buffer = io.BytesIO(fileContent.stream.read())

        result = detect(stream, buffer.getvalue())

        print(json.dumps(result, indent = 3)) 

        output.append({
            "filename" : uploaded_file,
            "boxes":  result['boxes'],
            "status": "OK"
        })

    return json.dumps(output, sort_keys=True), 200

@app.route("/delete", methods=["GET"])
def delete():
    token = request.values.get('token')  # The Datalake SAF token
    container = request.values.get('container')  # the Datalake Container
    blob = request.values.get('blob')  # the Datalake Blob

    container_client = get_container_client(token, container)

    blob_client = container_client.get_blob_client(blob)

    print('[DELETING] file %s' % (blob))

    try:
        blob_client.delete_blob()
    except Exception as e:
        print("delete_blob: " + str(e))
    
    output = []

    output.append({
        "status": "OK"
    })
    
    return json.dumps(output, sort_keys=True), 200

@app.route("/")
def start():
    return render_template("main.html")

if __name__ == "__main__":
    PORT = int(environ.get('PORT', '8080'))
    app.run(host='0.0.0.0', port=PORT)
