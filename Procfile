web: export PYTHONPATH=$PYTHONPATH:$(pwd)/engine:$(pwd)/engine/api && cd engine && uvicorn api.api_stateless:app --host 0.0.0.0 --port ${PORT:-8000}
