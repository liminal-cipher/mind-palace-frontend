# Mind Palace React + FastAPI Rebuild

이 폴더는 기존 `3D-mindpalace-AI-main.zip` 서비스를 React + FastAPI 구조로 감싼 재구성본입니다.

중요한 기준:

- 기존 UI와 서비스 흐름은 그대로 유지합니다.
- React는 당장 새 화면을 만들지 않고 기존 HTML 서비스를 포털로 띄웁니다.
- FastAPI는 기존 Express 서버가 하던 최소 API 역할만 대체합니다.
- PDF 업로드, GraphRAG, Python 라이브러리 분석 기능은 지금 구현하지 않습니다.
- 대신 나중에 붙일 수 있도록 API 네임스페이스와 데이터 계약 위치만 남겨둡니다.

## 현재 실행 화면

React 개발 서버를 열면 기존 첫 화면인 `vworld_3d_map_live.html`이 그대로 표시됩니다.

```text
frontend/public/legacy/vworld_3d_map_live.html
```

기존 방 페이지와 스캐너 페이지도 같이 보존했습니다.

```text
frontend/public/legacy/room-03-sejong.html
frontend/public/legacy/personal-room-scanner-3d.html
frontend/public/legacy/room-viewer.html
frontend/public/legacy/public/memory-palace-spec.mock.json
```

## 실행

백엔드:

```powershell
cd "C:\Users\ekffu\Documents\3차 프로젝트\mindpalace-react-fastapi"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8010
```

프론트:

```powershell
cd "C:\Users\ekffu\Documents\3차 프로젝트\mindpalace-react-fastapi\frontend"
npm install
echo VITE_API_BASE=http://127.0.0.1:8010> .env
npm run dev
```

브라우저:

```text
http://127.0.0.1:5173
```

## Azure Web App 배포

GitHub에는 이 폴더(`mindpalace-react-fastapi`) 안의 소스만 올립니다.

Azure Web App은 Python 런타임으로 만들고 Startup Command를 아래처럼 둡니다.

```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

프론트 빌드 없이 배포해도 FastAPI가 기존 서비스를 `/legacy/vworld_3d_map_live.html`로 직접 서빙합니다.
React/Vite 빌드 산출물이 있으면 `frontend/dist`를 우선 서빙하고, 없으면 legacy HTML로 fallback합니다.

## API

현재 API:

- `GET /api/health`
- `GET /api/client-config`
- `GET /api/vision-config`
- `POST /api/detect`
- `GET /api/integrations/pdf/status`

Azure Vision은 기존 `personal-room-scanner-3d.html`이 쓰는 API 이름을 그대로 살렸습니다.

필요 환경변수:

```text
VWORLD_API_KEY
AZURE_VISION_ENDPOINT
AZURE_VISION_KEY
```

Azure 포털에 이미 아래 이름으로 넣어둔 경우도 같이 읽습니다.

```text
AZURE_AI_VISION_ENDPOINT
AZURE_AI_VISION_KEY
VISION_ENDPOINT
VISION_KEY
```

`/api/integrations/pdf/status`는 PDF 기능이 아직 꺼져 있음을 알려주는 자리입니다. 실제 업로드/GraphRAG는 다음 단계에서 이 네임스페이스 아래에 붙이면 됩니다.

## 기존 파일 중 정리 기준

새 구조에서 **반드시 살려야 하는 파일** (legacy/ 에 보존):

- `vworld_3d_map_live.html`: 기존 메인 UI
- `room-01~05-*.html`: 5개 입장 방
- `room-03-sejong.html`: 대표 3D 방
- `personal-room-scanner-3d.html`: 기존 3D GLB 스캐너
- `room-viewer.html`: GLB 방 뷰어
- `public/memory-palace-spec.mock.json`: 방/개념/배치 데이터 계약
- `docs/SCAN_GEOMETRY_BASIS.md`, `docs/DEVLOG.md`: 스캐너 근거와 인수인계

배포 정리 시 **제거한 파일**:

- `vworld-geo-mapped-pavilions.png` (1.8MB): 어디서도 참조되지 않는 자료 이미지
- `TEAM_AI_SCANNER_SHARE.html`: 발표용 공유 페이지 (제품 기능 아님)
- `docs/superpowers/` (plans·specs): AI 설계 초안 문서
- `backend/requirements.txt`, `backend/startup.sh`: 루트의 `requirements.txt`·`startup.sh`와 중복

의존성/환경 파일은 `.gitignore`로 제외됩니다: `node_modules/`, `.venv/`, `.env`.
