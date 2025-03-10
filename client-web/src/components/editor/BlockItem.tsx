import React, { useRef, useEffect, useState, useCallback } from "react";
import { Block, BlockType } from "@/types/block";
import { cn } from "@/lib/utils";
import ChildBlocks from "./ChildBlocks";
import db from "@/db";
import BlockContent from "./blocks/BlockContent";
import BlockHandle from "./blocks/BlockHandle";
import { useBlockActions } from "./hooks/useBlockActions";
import { useBlockDrag } from "./hooks/useBlockDrag";
import { useCaretManager } from "@/lib/caret";
import { scrollCaretIntoView } from "@/lib/caret/caretUtils";
import { EditorState, SelectionState, createBlockStart } from "@/lib/editor";

interface BlockItemProps {
  block: Block;
  updateBlock: (id: string, changes: Partial<Block>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  addBlock: (blockType: BlockType, index: number) => Promise<string | null>;
  moveBlock: (blockId: string, targetIndex: number) => Promise<void>;
  indentBlock: (id: string) => Promise<void>;
  outdentBlock: (id: string) => Promise<void>;
  index: number;
  depth?: number;
  totalBlocks: number;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  setBlockRef?: (id: string, el: HTMLElement | null) => void;
  isSelected?: boolean;
  isFocused?: boolean;
  onSelect?: (id: string, multiSelect: boolean) => void;
  focusBlock?: (id: string) => void;
  onDuplicate?: () => void;
  onDragStart?: () => void;
  onDragOver?: (position: "before" | "after" | "child") => void;
  onDrop?: () => void;
  isDragged?: boolean;
  dropIndicator?: "before" | "after" | "child" | null;
  classNameExtra?: string;
  editorState?: EditorState | null;
  editorController?: {
    updateSelection: (selection: SelectionState | null) => void;
  } | null;
}

export default function BlockItem({
  block,
  updateBlock,
  deleteBlock,
  addBlock,
  moveBlock,
  indentBlock,
  outdentBlock,
  index,
  depth = 0,
  totalBlocks,
  onArrowUp,
  onArrowDown,
  setBlockRef,
  isSelected = false,
  isFocused = false,
  onSelect,
  focusBlock,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  isDragged = false,
  dropIndicator = null,
  classNameExtra = "",
  editorState,
  editorController,
}: BlockItemProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [hasChildren, setHasChildren] = useState(false);

  // 캐럿 관리자 초기화
  const caretManager = useCaretManager({
    editorRef: blockRef,
    blockId: block.id,
  });

  // 자식 블록 존재 여부 확인
  useEffect(() => {
    const loadChildBlocks = async () => {
      if (block.content.length > 0) {
        const children = await Promise.all(
          block.content.map((id) => db.getBlock(id)),
        );
        const validChildren = children.filter(Boolean);
        setHasChildren(validChildren.length > 0);
      } else {
        setHasChildren(false);
      }
    };

    loadChildBlocks();
  }, [block.content]);

  // ref 설정 및 포커스 처리
  useEffect(() => {
    if (setBlockRef) {
      setBlockRef(block.id, blockRef.current);
    }

    // CARET: 포커스된 블록 캐럿 관리
    if (isFocused && blockRef.current) {
      const editableElement = caretManager.getEditableElement();

      if (editableElement) {
        // 포커스 및 캐럿 복원 강화
        setTimeout(() => {
          // 1. contenteditable 요소에 포커스
          editableElement.focus();

          // 2. 저장된 커서 위치 정보가 있는지 확인하고 복원
          caretManager.restoreColumnAfterBlockNavigation();

          // 3. 보이는 영역으로 스크롤
          scrollCaretIntoView();
        }, 0);
      }
    }
  }, [block.id, setBlockRef, isFocused, caretManager]);

  // 에디터 상태에서 현재 블록의 선택 영역 확인
  useEffect(() => {
    if (editorState?.selection && isFocused) {
      // 현재 블록에 선택 영역이 있는지 확인
      const { anchor, focus } = editorState.selection;
      const isSelected =
        anchor.blockId === block.id || focus.blockId === block.id;

      if (isSelected) {
        // editorState의 선택 영역을 DOM에 반영하는 로직은 상위 컴포넌트에서 처리
        // 여기서는 필요한 추가 동작만 수행
      }
    }
  }, [editorState?.selection, block.id, isFocused]);

  // 블록 액션 훅
  const {
    isExpanded,
    isHovered,
    setIsHovered,
    handleContentChange,
    handleTypeChange,
    handleAddBlock,
    handleIndent,
    handleOutdent,
    handleDeleteBlock,
    handleDuplicateBlock,
    toggleExpand,
    toggleTodo,
    handleMouseDown,
  } = useBlockActions(
    block,
    index,
    totalBlocks,
    updateBlock,
    addBlock,
    indentBlock,
    outdentBlock,
    deleteBlock,
    moveBlock,
    onDuplicate,
  );

  // 드래그 앤 드롭 훅
  const {
    handleDragStart: onDragStartHandler,
    handleDragOver: onDragOverHandler,
    handleDrop: onDropHandler,
    handleDragEnd,
  } = useBlockDrag({
    blockId: block.id,
    onDragStart,
    onDragOver,
    onDrop,
  });

  // 블록 선택 처리
  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 에디터 상태의 selection 업데이트
    if (editorController) {
      const selection = createBlockStart(block.id);
      editorController.updateSelection({
        anchor: selection,
        focus: selection,
        isCollapsed: true,
        isBackward: false,
      });
    }

    // CARET: 블록 클릭 시 캐럿 관리
    if (onSelect) {
      const multiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      onSelect(block.id, multiSelect);
    }

    if (focusBlock) {
      // 이전에 포커스 상태 저장
      const wasAlreadyFocused = isFocused;

      // 포커스 설정
      focusBlock(block.id);

      // 블록이 이미 포커스된 상태였는데 다시 클릭했다면
      // 캐럿을 클릭 위치로 조정 (기본 동작 허용)
      if (wasAlreadyFocused) {
        // 브라우저가 캐럿을 처리하도록 둠
      } else {
        // 새로 포커스된 경우, 저장된 위치나 블록 끝으로 이동
        setTimeout(() => {
          // 조건문으로 변경하여 no-unused-expressions 에러 해결
          if (!caretManager.restoreCaret()) {
            caretManager.moveToEnd();
          }
        }, 0);
      }
    }
  };

  // 드래그 이벤트 처리기
  const handleDragOverEvent = (e: React.DragEvent) => {
    onDragOverHandler(e, blockRef);
  };

  // 방향키 핸들러
  const handleArrowUp = () => {
    if (onArrowUp) {
      // 현재 블록의 캐럿 위치를 저장하고 이전 블록으로 이동
      if (caretManager.isAtLineStart()) {
        caretManager.saveColumnForBlockNavigation();
        onArrowUp();
      }
    }
  };

  const handleArrowDown = () => {
    if (onArrowDown) {
      // 현재 블록의 캐럿 위치를 저장하고 다음 블록으로 이동
      if (caretManager.isAtLineEnd()) {
        caretManager.saveColumnForBlockNavigation();
        onArrowDown();
      }
    }
  };

  const handleChangeColor = useCallback(
    async (color: string) => {
      // 색상 값의 종류에 따라 처리
      if (color.endsWith("-bg")) {
        // 배경색 변경
        const bgColor = color.replace("-bg", "");
        await updateBlock(block.id, {
          format: {
            ...block.format,
            backgroundColor: bgColor || null, // 빈 문자열이면 null로 설정하여 삭제
          },
        });
      } else {
        // 텍스트 색상 변경
        await updateBlock(block.id, {
          format: {
            ...block.format,
            color: color || null, // 빈 문자열이면 null로 설정하여 삭제
          },
        });
      }
    },
    [block.id, block.format, updateBlock],
  );

  return (
    <div
      ref={blockRef}
      data-block-id={block.id}
      className={cn(
        "block-item group relative",
        classNameExtra,
        isSelected && "bg-accent/20 rounded",
        isFocused && "ring-primary/40 rounded",
        isDragged && "opacity-50",
      )}
      onClick={handleBlockClick}
      draggable
      onDragStart={onDragStartHandler}
      onDragOver={handleDragOverEvent}
      onDrop={onDropHandler}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-block-type={block.type}
    >
      {/* 드롭 표시선 */}
      {dropIndicator === "before" && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10" />
      )}
      {dropIndicator === "after" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10" />
      )}
      {dropIndicator === "child" && (
        <div className="absolute inset-0 border-2 border-primary/30 rounded z-10 pointer-events-none" />
      )}

      {/* 색 표시자 (color indicator): 노션의 블록 색상 표시 기능 */}
      {block.format?.color && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
          style={{ backgroundColor: block.format.color }}
        />
      )}

      {/* 블록 컨텐츠 부분 */}
      <div className="flex w-full">
        {/* 왼쪽 핸들 영역 */}
        <BlockHandle
          isHovered={isHovered}
          isSelected={isSelected}
          onMouseDown={handleMouseDown}
          onAddBlock={handleAddBlock}
          onTypeChange={handleTypeChange}
          onDuplicate={handleDuplicateBlock}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
          onDelete={handleDeleteBlock}
          isFirstChild={index <= 0}
          hasParent={!!block.parent}
          onChangeColor={handleChangeColor}
        />

        {/* 실제 블록 콘텐츠 */}
        <BlockContent
          block={block}
          blockType={block.type}
          isExpanded={isExpanded}
          toggleExpand={toggleExpand}
          handleContentChange={handleContentChange}
          handleAddBlock={handleAddBlock}
          handleIndent={handleIndent}
          handleOutdent={handleOutdent}
          handleDeleteBlock={index > 0 ? handleDeleteBlock : undefined}
          handleChangeType={handleTypeChange}
          toggleTodo={toggleTodo}
          onArrowUp={handleArrowUp}
          onArrowDown={handleArrowDown}
          caretManager={caretManager}
          editorState={editorState}
          editorController={editorController}
        />
      </div>

      {/* 자식 블록 */}
      {hasChildren && isExpanded && (
        <ChildBlocks
          parentId={block.id}
          addBlock={addBlock}
          updateBlock={updateBlock}
          deleteBlock={deleteBlock}
          moveBlock={moveBlock}
          indentBlock={indentBlock}
          outdentBlock={outdentBlock}
          depth={depth + 1}
          editorState={editorState}
          editorController={editorController}
        />
      )}
    </div>
  );
}
