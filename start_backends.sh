#!/bin/bash
docker-compose build backend_work backend_charity backend_atc backend_test && \
  docker-compose stop backend_work backend_charity backend_atc backend_test && \
  docker-compose rm -f backend_work backend_charity backend_atc backend_test && \
  docker-compose up -d backend_work backend_charity backend_atc backend_test
