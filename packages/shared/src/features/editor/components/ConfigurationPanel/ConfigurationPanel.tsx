import { useCallback, useState, useEffect } from 'react';
import {
  useConfigurationPanelStore,
  type ConfigState
} from '@shared/features/editor/stores/configurationPanelStore';
import { calculateLastFramePreview } from '@shared/utils/time';
import { useDebouncedCallback } from '@shared/hooks/useDebounce';
import { useVideoMetadata } from '@shared/features/editor/hooks/useVideoMetadata';

import { Button } from '@shared/components/ui/Button/Button';
import { Timeline } from '../Timeline/Timeline';
import { NoVideoInterstitial } from './NoVideoInterstitial/NoVideoInterstitial';

import { StartTimeInput } from './StartTimeInput/StartTimeInput';
import { DurationInput } from './DurationInput/DurationInput';
import { FrameRateInput } from './FrameRateInput/FrameRateInput';
import { WidthInput } from './WidthInput/WidthInput';
import { HeightInput } from './HeightInput/HeightInput';
import { QualityInput } from './QualityInput/QualityInput';

import { storageAdapter } from '@shared/utils/storage';
import type { QuickStartMode } from '@shared/adapters/types';
import css from './ConfigurationPanel.module.css';

interface ConfigurationPanelProps {
  onSubmit: (config: ConfigState) => void;
}

export function ConfigurationPanel({ onSubmit }: ConfigurationPanelProps) {
  const start = useConfigurationPanelStore((state) => state.start);
  const duration = useConfigurationPanelStore((state) => state.duration);
  const width = useConfigurationPanelStore((state) => state.width);
  const height = useConfigurationPanelStore((state) => state.height);
  const framerate = useConfigurationPanelStore((state) => state.framerate);
  const videoDuration = useConfigurationPanelStore(
    (state) => state.videoDuration
  );

  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );
  const seekVideo = useConfigurationPanelStore((state) => state.seekVideo);
  const fetchVideoMetadata = useConfigurationPanelStore(
    (state) => state.fetchVideoMetadata
  );
  const captureFrame = useConfigurationPanelStore(
    (state) => state.captureFrame
  );

  const previewTime = useConfigurationPanelStore((state) => state.previewTime);

  const { isMetadataLoaded } = useVideoMetadata();

  // Quick GIF defaults
  const [quickStartMode, setQuickStartMode] = useState<QuickStartMode>('current');
  const [quickDurationSec, setQuickDurationSec] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const mode = await storageAdapter.getQuickStartMode();
        const dur = await storageAdapter.getQuickDuration();
        setQuickStartMode(mode);
        setQuickDurationSec(Math.round((dur || 0) / 100) / 10);
      } catch {}
    })();
  }, []);


  const debouncedSeekVideo = useDebouncedCallback(
    async (time: number) => {
      await seekVideo(time);
      captureFrame(time);
    },
    100,
    { maxWait: 500 }
  );

  // Separate preview update logic
  const handlePreviewRequest = useCallback(
    (time: number) => {
      debouncedSeekVideo(time);
    },
    [debouncedSeekVideo]
  );

  // Store values are now in Milliseconds
  const videoDurationMs = videoDuration;
  const durationMs = duration;
  const startMs = start;

  // Max calculations in MS
  const maxStart = Math.max(0, videoDurationMs - durationMs);
  const maxDuration = Math.min(videoDurationMs - startMs, 30000); // 30s limit

  // Early return MUST be after all hooks
  if (!isMetadataLoaded) {
    return <NoVideoInterstitial onRetry={fetchVideoMetadata} />;
  }

  // Timeline callbacks provide milliseconds directly
  function handleTimelineChange(
    newStartMs: number,
    newDurationMs: number,
    context: 'start' | 'end'
  ): void {
    storeHandleInputChange({
      name: 'start',
      value: newStartMs
    });
    storeHandleInputChange({
      name: 'duration',
      value: newDurationMs
    });

    if (context === 'start') {
      handlePreviewRequest(newStartMs);
    } else {
      const previewTimeMs = calculateLastFramePreview(
        newStartMs,
        newDurationMs,
        framerate
      );
      handlePreviewRequest(previewTimeMs);
    }
  }

  function handleTimelineHandleFocus(handle: 'start' | 'end') {
    if (handle === 'start') {
      handlePreviewRequest(start);
    } else {
      const previewTimeMs = calculateLastFramePreview(
        start,
        duration,
        framerate
      );
      handlePreviewRequest(previewTimeMs);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    event.stopPropagation();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentConfigState = useConfigurationPanelStore.getState();
    onSubmit({
      start, // MS
      duration, // MS
      width,
      height,
      framerate,
      quality: currentConfigState.quality,
      aspectRatio: currentConfigState.aspectRatio,
      videoDuration: currentConfigState.videoDuration,
      videoWidth: currentConfigState.videoWidth,
      videoHeight: currentConfigState.videoHeight,
      previewImage: currentConfigState.previewImage,
      previewTime: currentConfigState.previewTime
    });
  }

  return (
    <form
      className={css.form}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate>
      <div className={css.timeline}>
        <Timeline
          totalDuration={videoDuration}
          startTime={start}
          duration={duration}
          fps={framerate}
          previewTime={previewTime}
          onChange={handleTimelineChange}
          onHandleFocus={handleTimelineHandleFocus}
        />
      </div>

      <StartTimeInput
        onPreviewRequest={handlePreviewRequest}
        maxStart={maxStart}
      />

      <DurationInput
        onPreviewRequest={handlePreviewRequest}
        maxDuration={maxDuration}
      />

      <FrameRateInput
        onPreviewRequest={handlePreviewRequest}
        previewTime={previewTime}
      />

      <WidthInput />

      <HeightInput />

      <QualityInput />


      {/* Quick GIF defaults – fully editable */}
      <div className={css.quickSettings} style={{
        marginTop: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        background: 'rgba(14, 165, 233, 0.08)',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        fontSize: '13px'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: '#0ea5e9' }}>
          Quick GIF defaults
        </div>
        <label style={{ display: 'block', marginBottom: '6px' }}>
          Start from
          <select
            value={quickStartMode}
            onChange={async (e) => {
              const v = e.target.value as QuickStartMode;
              setQuickStartMode(v);
              await storageAdapter.setQuickStartMode(v);
            }}
            style={{ marginLeft: '8px', padding: '2px 6px', borderRadius: '4px' }}
          >
            <option value="current">Current time</option>
            <option value="beginning">Beginning of video</option>
            <option value="full">Entire video</option>
          </select>
        </label>
        {quickStartMode !== 'full' && (
          <label style={{ display: 'block', marginBottom: '4px' }}>
            Duration (seconds, 0 = until end)
            <input
              type="number"
              min={0}
              max={120}
              step={0.5}
              value={quickDurationSec}
              onChange={async (e) => {
                const sec = Math.max(0, parseFloat(e.target.value) || 0);
                setQuickDurationSec(sec);
                await storageAdapter.setQuickDuration(Math.round(sec * 1000));
              }}
              style={{ marginLeft: '8px', width: '64px', padding: '2px 6px', borderRadius: '4px' }}
            />
          </label>
        )}
        <div style={{ opacity: 0.7, fontSize: '11px', marginTop: '4px' }}>
          Right-click a video → “Quick GIF” uses these settings and downloads automatically.
          Width / FPS / Quality above are also used.
        </div>
      </div>

      <div className={css.actions}>
        <Button
          id="clip2gif-submit"
          rounded={true}
          type="submit"
          className={css.submit}>
          Create GIF
        </Button>
      </div>
    </form>
  );
}
