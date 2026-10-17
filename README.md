# Reflow Studio MVP

`.psd`·`.svg` 파일의 요소를 새 규격에 맞춰 자동 배치하고, 개별 수정 후 PNG로 저장하는 웹 편집기입니다. 로컬 서버에서는 PDF 호환 `.ai` 변환도 지원합니다. 서비스 정의와 구현 기준은 [PROJECT_INTENT.md](PROJECT_INTENT.md)에 정리했습니다.

## 웹사이트

- 접속: https://sabyunrepo.github.io/reflow-studio/
- GitHub Pages에서는 PSD·SVG 업로드, 개별 편집, 반응형 배치, PNG 출력을 사용합니다.
- PSD 파일은 사용자의 브라우저에서 처리합니다.
- GitHub Pages는 서버 실행을 지원하지 않아 `.ai` 직접 변환은 로컬 서버에서 사용합니다. 웹에서는 Illustrator에서 SVG로 저장한 파일을 업로드하세요. AI 벡터 샘플은 사전 변환된 SVG로 제공합니다.
- 6개 레이어의 `assets/reflow-demo.psd`는 이 프로젝트에서 직접 만든 데모입니다. PSD 샘플 버튼으로 불러올 수 있습니다.

## 실행

macOS에서 Poppler가 설치되어 있고 `pdftocairo`가 PATH에 있는 상태로:

```sh
node server.mjs
```

브라우저에서 `http://localhost:4173`을 엽니다. Node.js 20 이상을 권장합니다.

## 사용 범위

- PDF 호환 정보가 포함된 Illustrator `.ai` 파일의 첫 페이지를 SVG 벡터로 읽습니다.
- RGB·8비트·100MB 이하 `.psd` 파일은 [ag-psd](https://github.com/Agamnentzar/ag-psd) 31.0.3으로 레이어 이미지를 개별 요소로 읽습니다. 배경·효과는 비율을 유지한 채 캔버스를 꽉 채우며, 기본 배치는 여백 구역과 요소 관계를 유지하고 가로 출력에서는 본문과 제목을 좌우로 재배치합니다. 각 요소는 개별 편집 가능하며 직접 수정한 비율은 다른 규격에서도 유지합니다. 래스터 마스크와 64px 이하 기본 단색 안쪽·바깥쪽 테두리를 반영합니다. RGB/8비트 외 색상 모드, PSB, 복합 효과와 일부 스마트 오브젝트는 제한될 수 있습니다. 라이브러리와 MIT 라이선스는 `vendor/`에 포함되어 있습니다.
- 오른쪽 PSD 레이어 패널에서 미리보기와 이름을 보며 선택하고, 표시·숨김을 바꿀 수 있습니다. 숨긴 상태는 규격을 바꿔도 유지되고 PNG 출력에 반영됩니다.
- 도형과 글자 묶음을 선택해 테두리 핸들로 이동·비율 유지 크기 조절·회전할 수 있습니다. 조작은 [Moveable](https://daybrush.com/moveable/) 0.53.0을 사용하며 라이브러리 파일과 MIT 라이선스는 `vendor/`에 포함되어 있습니다.
- 캔버스 요소를 마우스 오른쪽 버튼으로 눌러 맨 앞으로·앞으로·뒤로·맨 뒤로 순서를 바꿀 수 있습니다.
- 정사각형, 세로형, 배너 규격에 맞춰 요소를 자동 재배치하고 PNG로 내보냅니다.
- 테스트용 실제 Illustrator 파일은 [CC0 Illustrator templates](https://github.com/richrdkng/adobe-illustrator-templates) 저장소의 `gh-markdown-banner.ai`입니다. Adobe Illustrator 2020에서 저장된 800×320pt 배너이며, 변환 결과에 개별 벡터 경로 8개가 있습니다.
- 변환 한계 확인용으로 [IllustratorArt](https://github.com/jsmentch/IllustratorArt) 저장소의 `Timeline_Xanthe_Jeff.ai`도 확인했습니다. PDF 미리보기에는 복합 필터와 래스터가 들어가 있어 현재 편집 요소로 추출되지 않습니다.
- 작은 기술 확인용 AI 파일은 [FreeToolsForWeb AI 샘플](https://freetoolsforweb.com/sample-files/images/ai)에서 가져왔습니다.
- 공개 데모 PSD는 직접 만든 `assets/reflow-demo.psd`입니다. 로컬 개발 중 사용했던 외부 PSD와 개인 검수 이미지 출력은 저장소에 포함하지 않습니다.

각 요소는 캔버스 대비 가로·세로 중심 위치(%), 너비(%), 최대 높이(%)를 따로 가집니다. 캔버스 가로·세로를 직접 입력하면 각 요소의 배율과 위치를 다시 계산합니다. 선택한 요소의 반응형 기준은 왼쪽 패널에서 조정합니다. 마우스 이동·크기·회전 수정도 해당 요소의 비율과 회전으로 기억해 다른 규격에 반영합니다. 기본 반응형 배치로 초기화하면 이러한 수정 기준을 초기화하고 숨김 상태는 유지합니다.

AI의 중첩 변환은 캔버스 좌표로 환산해 요소별로 계산합니다. 각 요소는 독립된 선택 대상이며 원본의 관련 요소는 기본 자동 배치에서 상대 관계를 유지합니다. PSD 폴더를 넘는 앞뒤 순서도 변경할 수 있고 규격 변경 시 보존합니다. 의미에 따른 디자인 생성이나 임의의 디자인의 충돌 회피는 보장하지 않습니다.

목표 PNG 크기는 선택한 픽셀 규격으로 저장합니다. AI 파일에 PDF 호환 정보가 없거나 글꼴·효과가 PDF에 보존되지 않은 경우에는 Illustrator에서 PDF 호환 파일 옵션을 켜고 다시 저장해야 합니다. 벡터 경로로 변환된 글자는 원래 텍스트처럼 문구를 수정할 수 없습니다.

## 검수

`node --test tests/*.test.mjs`로 실제 PSD에서 추출한 레이어 좌표와 마스크·테두리 픽셀 처리를 검사합니다. 브라우저 상호작용과 실제 PNG 육안 검수 내역은 [QA_REVIEW.md](QA_REVIEW.md)에 기록합니다. 검수 이미지와 PNG 출력은 로컬 `artifacts/`에 보관합니다.

## 배포

`npm run build`는 `_site/`에 실행에 필요한 정적 파일만 준비합니다. `main` 브랜치로 푸시하면 `.github/workflows/pages.yml`에서 GitHub Pages로 자동 배포합니다. 배포 폴더에는 HTML·모듈·라이브러리·공개 데모만 포함합니다. 추가 패키지 설치는 필요하지 않습니다.

로컬 `server.mjs`는 `runtime-config.mjs` 응답으로 AI 변환 API 경로를 제공하고, 정적 배포 파일은 API 없이 동작합니다.
