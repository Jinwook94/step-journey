import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { flattenSteps, groupData } from "@/data";
import { StepContainerMap } from "@/types/journey";
import { handleKeyboardShortcuts, scrollToCurrentStep } from "./journey.utils";

import { JourneySidebar } from "./JourneySidebar";
import { JourneyHeader } from "./JourneyHeader";
import { JourneyContent } from "./JourneyContent";
import { JourneyFooter } from "./JourneyFooter";
import { JourneyMapModal } from "./JourneyMapModal";
import PATH from "@/constants/path";

export default function JourneyPage() {
  // 전역 스텝 인덱스
  const [globalIndex, setGlobalIndex] = useState(0);

  // 현재 스텝 (flattenSteps 에서 globalIndex 로 추출)
  const currentStep = flattenSteps[globalIndex];

  // 전체 스텝 개수
  const totalSteps = flattenSteps.length;

  // 그룹(Phase) 펼침/접힘 상태
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  // 지도 모달 상태
  const [isMapOpen, setIsMapOpen] = useState(false);

  // 다크 모드 (임의 예시)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 네비게이션 (About 페이지 이동용 등)
  const navigate = useNavigate();

  // 각 Phase 별 ScrollArea DOM 참조
  const stepContainerRefs = useRef<StepContainerMap>({});

  // Prev / Next 핸들러
  const goPrev = () => setGlobalIndex((prev) => Math.max(0, prev - 1));
  const goNext = () =>
    setGlobalIndex((prev) => Math.min(prev + 1, totalSteps - 1));

  // 키보드 단축키 등록 (m키 지도, 방향키 Prev/Next 등)
  useEffect(() => {
    const handler = (e: KeyboardEvent) =>
      handleKeyboardShortcuts(e, setIsMapOpen, goPrev, goNext);
    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // currentStep 바뀔 때 해당 group 펼치도록
  useEffect(() => {
    setExpandedGroups({ [currentStep.groupId]: true });
  }, [currentStep.groupId]);

  // 펼쳐진 Phase 내부에서 현재 스텝 위치로 스크롤
  useEffect(() => {
    scrollToCurrentStep(currentStep, expandedGroups, stepContainerRefs);
  }, [currentStep, expandedGroups]);

  // 다크 모드 토글
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="flex h-screen bg-white">
      {/* 좌측 사이드바 */}
      <JourneySidebar
        currentStep={currentStep}
        expandedGroups={expandedGroups}
        setExpandedGroups={setExpandedGroups}
        stepContainerRefs={stepContainerRefs}
        onClickStep={(groupId, stepId) => {
          const found = flattenSteps.find(
            (fs) => fs.groupId === groupId && fs.stepIdInGroup === stepId,
          );
          if (found) setGlobalIndex(found.globalIndex);
        }}
      />

      {/* 우측 영역: 헤더 / 본문 / 하단 */}
      <div className="flex flex-1 flex-col bg-white">
        {/* 헤더 */}
        <JourneyHeader
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onOpenMap={() => setIsMapOpen(true)}
          onNavigateAbout={() => navigate(PATH.ABOUT)}
        />

        {/* 본문: currentStep 내용 */}
        <JourneyContent currentStep={currentStep} />

        {/* 하단: Prev/Next + Slider */}
        <JourneyFooter
          globalIndex={globalIndex}
          setGlobalIndex={setGlobalIndex}
          goPrev={goPrev}
          goNext={goNext}
          totalSteps={totalSteps}
        />
      </div>

      {/* 지도 모달 */}
      <JourneyMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        currentStep={currentStep}
        groupData={groupData}
      />
    </div>
  );
}
