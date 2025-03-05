#!/usr/bin/env bash
#
# 이 부분을 수정하여 병합할 파일 경로들을 지정하세요
##############################################
# 설정 부분 - 이 부분만 수정하세요
##############################################
# 병합할 경로 목록 (client-web 포함 경로 또는 절대 경로)
TARGET_PATHS=(
    "client-web/src/lib/caret"
    "client-web/src/components/editor/BlockItem.tsx"
    "client-web/src/components/editor/TextEditor.tsx"
    "client-web/src/components/editor/blocks/BlockContent.tsx"
    "client-web/src/components/editor/hooks/useTextEditorKeydown.ts"
    "client-web/src/components/editor/hooks/useTextFormatting.ts"
)

# 결과를 저장할 파일 (client-web 기준 상대 경로)
OUTPUT_FILE="script/combined_paths.txt"
##############################################
# 설정 끝
##############################################

set -e

##############################################
# 0) 스크립트 위치 기준으로 상위 디렉토리(client-web)로 이동
##############################################
cd "$(dirname "$0")/.."
CURRENT_DIR="$(basename "$(pwd)")"
CLIENT_WEB_PATH="$(pwd)"

# 기존 파일 삭제 & 디렉토리 생성
rm -f "$OUTPUT_FILE"
mkdir -p "$(dirname "$OUTPUT_FILE")"

# 구현시 주의사항
#echo "# StepJourney React Client 구현시 주의사항:" >> "$OUTPUT_FILE"
#echo "- 너의 답변의 코드를 그대로 복사하여 붙여넣어서 prod 배포할 예정이므로 주석으로 생략하는 부분 없이 완전한 코드로 보여줘. 하지만 수정사항이 없는 파일의 코드는 보여주지마." >> "$OUTPUT_FILE"
#echo "- 구현을 위해 조금이라도 수정이 된 파일은 해당 파일의 전체 코드를 완전하게 보여줘. 하지만 수정사항이 없는 파일의 코드는 보여주지마." >> "$OUTPUT_FILE"
#echo "- React 클라이언트에서 UI 디자인은 shadcd/ui (\`radix-ui\`)가 추구하는 것처럼 minimal함을 추구해야함" >> "$OUTPUT_FILE"
#echo "- React 클라이언트에서 필요한 컴포넌트를 \`npx shadcn@latest add [component]\` 커맨드로 추가해서 사용해야함" >> "$OUTPUT_FILE"
#echo "- React 클라이언트에서 아이콘은 \`\"@tabler/icons-react\"\` 혹은 'lucide-react' 에서 적절한 것을 가져다가 사용해야함" >> "$OUTPUT_FILE"
#echo "" >> "$OUTPUT_FILE"

##############################################
# 1) 프로젝트 기술 스택 출력
##############################################
#echo "# Project Tech stack:" >> "$OUTPUT_FILE"
#echo "- React" >> "$OUTPUT_FILE"
#echo "- Vite" >> "$OUTPUT_FILE"
#echo "- TypeScript" >> "$OUTPUT_FILE"
#echo "- Tailwind CSS" >> "$OUTPUT_FILE"
#echo "- shadcn/ui" >> "$OUTPUT_FILE"
#echo "- radix-ui" >> "$OUTPUT_FILE"
#echo "- tabler/icons-react" >> "$OUTPUT_FILE"
#echo "" >> "$OUTPUT_FILE"

##############################################
# 2) 대상 경로 정보 출력
##############################################
#echo "# Target Paths:" >> "$OUTPUT_FILE"
#for path in "${TARGET_PATHS[@]}"; do
#    echo "- $path" >> "$OUTPUT_FILE"
#done
#echo "" >> "$OUTPUT_FILE"

##############################################
# 3) 파일 목록 수집 및 내용 병합
##############################################
echo "" >> "$OUTPUT_FILE"

# 각 입력 경로 처리
for TARGET_PATH in "${TARGET_PATHS[@]}"; do
    # 절대 경로인지 확인
    if [[ "$TARGET_PATH" == /* ]]; then
        # 절대 경로인 경우
        FULL_PATH="$TARGET_PATH"

        # client-web 경로로 시작하는지 확인하고 상대 경로로 변환
        if [[ "$FULL_PATH" == *"$CLIENT_WEB_PATH"* ]]; then
            RELATIVE_PATH="${FULL_PATH#$CLIENT_WEB_PATH/}"
        else
            RELATIVE_PATH="$FULL_PATH"
        fi
    else
        # 상대 경로 또는 "client-web/"으로 시작하는 경로
        if [[ "$TARGET_PATH" == client-web/* ]]; then
            # "client-web/" 접두사 제거
            CLEAN_PATH="${TARGET_PATH#client-web/}"
            FULL_PATH="$CLIENT_WEB_PATH/$CLEAN_PATH"
            RELATIVE_PATH="$CLEAN_PATH"
        else
            # 일반 상대 경로
            FULL_PATH="$CLIENT_WEB_PATH/$TARGET_PATH"
            RELATIVE_PATH="$TARGET_PATH"
        fi
    fi

    # 경로가 존재하는지 확인
    if [ ! -e "$FULL_PATH" ]; then
        echo "경고: '$FULL_PATH' 경로가 존재하지 않습니다. 건너뜁니다." | tee -a "$OUTPUT_FILE"
        continue
    fi

    # 경로 정보 출력
    echo "## Files from: client-web/$RELATIVE_PATH" >> "$OUTPUT_FILE"

    # 경로가 파일인 경우 단일 파일만 포함
    if [ -f "$FULL_PATH" ]; then
        echo "### client-web/$RELATIVE_PATH:" >> "$OUTPUT_FILE"
        cat "$FULL_PATH" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    # 경로가 디렉토리인 경우 하위 파일 모두 포함
    elif [ -d "$FULL_PATH" ]; then
        # 디렉토리 구조 출력
        echo "### Directory Structure:" >> "$OUTPUT_FILE"
        tree "$FULL_PATH" --charset=ASCII -I "node_modules|dist|.idea|package-lock.json|fonts" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"

        # 디렉토리 내의 모든 파일 수집 (특정 확장자만)
        find "$FULL_PATH" \
            \( -name "*.js" \
               -o -name "*.jsx" \
               -o -name "*.ts" \
               -o -name "*.tsx" \
               -o -name "*.yml" \
               -o -name "*.css" \
               -o -name "*.html" \
               -o -name "*.json" \
               -o -name "*.sh" \) \
            -type f \
            ! -path "*/node_modules/*" \
            ! -path "*/dist/*" \
            ! -path "*/.idea/*" \
            ! -path "*/fonts/*" \
            ! -path "*/src/data/*" \
            ! -path "*/script/*" \
            ! -name "package-lock.json" \
            | sort \
            | while read -r file
        do
            # 상대 경로 계산
            file_relative="${file#$CLIENT_WEB_PATH/}"

            echo "### client-web/$file_relative:" >> "$OUTPUT_FILE"
            cat "$file" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        done
    fi

    echo "" >> "$OUTPUT_FILE"
done

##############################################
# 4) 마무리 안내
##############################################
echo "지정한 경로들의 파일이 $CURRENT_DIR/$OUTPUT_FILE 에 성공적으로 병합되었습니다."
