// Zoom control utilities
export const createZoomControls = (
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  canvasContainerRef: React.RefObject<HTMLDivElement>,
  originalImageWidthRef: React.MutableRefObject<number>,
  originalImageHeightRef: React.MutableRefObject<number>
) => {
  const zoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
  const zoomToActual = () => setZoomLevel(1);
  
  const zoomToFit = () => {
    if (!canvasRef.current || !originalImageWidthRef.current || !originalImageHeightRef.current) return;
    
    const container = canvasContainerRef.current;
    if (!container) return;
    
    // Get the actual available space for the image
    const containerRect = container.getBoundingClientRect();
    const availableWidth = containerRect.width - 128; // Account for padding (64px on each side)
    const availableHeight = containerRect.height - 128; // Account for padding (64px on each side)
    
    // Calculate scale factors for both dimensions
    const scaleX = availableWidth / originalImageWidthRef.current;
    const scaleY = availableHeight / originalImageHeightRef.current;
    
    // Use the smaller scale to ensure the image fits completely
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    console.log('Zoom to fit:', { 
      containerSize: { width: containerRect.width, height: containerRect.height },
      availableSpace: { width: availableWidth, height: availableHeight },
      imageSize: { width: originalImageWidthRef.current, height: originalImageHeightRef.current },
      scales: { scaleX, scaleY },
      finalScale: scale 
    });
    
    setZoomLevel(scale);
  };
  
  return {
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToActual
  };
};

// Fullscreen utilities
export const createFullscreenControls = (
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>,
  mainLayoutRef: React.RefObject<HTMLDivElement>
) => {
  const toggleFullscreen = async (isFullscreen: boolean) => {
    try {
      if (!isFullscreen) {
        // Enter fullscreen on the main layout container
        const element = mainLayoutRef.current;
        if (!element) return;
        
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Fullscreen operation failed:', error);
    }
  };

  const setupFullscreenListeners = (setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>) => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  };

  return {
    toggleFullscreen,
    setupFullscreenListeners
  };
};