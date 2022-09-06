FROM tensorflow/tensorflow

RUN apt-get update --fix-missing
RUN apt-get install -y nodejs npm
RUN apt-get install -y git
RUN apt-get install -y libsm6 libxext6
RUN apt-get install -y libxrender-dev
RUN apt-get install -y libgl1-mesa-dev


WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in docker-requirements.txt
RUN pip install --upgrade pip
RUN pip install --trusted-host pypi.python.org -r docker-requirements.txt

RUN npm install 

# Make port 80 available to the world outside this container
EXPOSE 8080

# Define environment variable
ENV NAME yatt-cloud

# Run app.py when the container launches
CMD ["python", "app.py"]