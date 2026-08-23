docker-compose build backend_work backend_charity backend_atc backend_test && \
	docker-compose down && \
	docker-compose up -d backend_work backend_charity backend_atc backend_test
