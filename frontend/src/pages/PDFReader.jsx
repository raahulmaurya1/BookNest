import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { booksAPI } from '../api/books';
import Loading from '../components/Loading';

const PDFReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(null); // null until loaded
  const [initialPageLoaded, setInitialPageLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // PDF.js instance states
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [visiblePages, setVisiblePages] = useState({});
  const [basePageSize, setBasePageSize] = useState({ width: 595, height: 842 });
  const [isFitWidth, setIsFitWidth] = useState(true);

  const debounceTimerRef = useRef(null);
  const currentPageRef = useRef(currentPage);
  const renderedPages = useRef({});
  const pageRefs = useRef({});
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (currentPage !== null) {
      currentPageRef.current = currentPage;
    }
  }, [currentPage]);

  // Load PDF.js script dynamically on mount
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfjsLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load PDF library. Please check your internet connection.');
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    loadBookAndPDF();
    return () => {
      // Save progress on unmount if timer pending
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (bookId && currentPageRef.current !== null) {
        booksAPI.updateProgress(bookId, currentPageRef.current).catch(() => {});
      }
    };
  }, [bookId]);

  const loadBookAndPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      const [bookRes, pdfRes] = await Promise.all([
        booksAPI.getById(bookId),
        booksAPI.getPDFUrl(bookId),
      ]);

      const fetchedBook = bookRes.data;
      setBook(fetchedBook);
      setPdfUrl(pdfRes.data?.pdf_url);

      const startPage = fetchedBook.current_page > 0 ? fetchedBook.current_page : 1;
      setCurrentPage(startPage);
      setInitialPageLoaded(true);
    } catch (err) {
      console.error('Failed to load PDF reader data:', err);
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to load PDF document or access is denied.';
      setError(msg);
      setLoading(false);
    }
  };

  // Load PDF document once library and url are ready
  useEffect(() => {
    if (!pdfjsLoaded || !pdfUrl) return;
    const loadPDFDoc = async () => {
      try {
        setLoading(true);
        const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        // Auto-correct stale or missing total_pages on the backend to allow progress sync to work
        if (book && book.total_pages !== pdf.numPages) {
          setBook(prev => ({ ...prev, total_pages: pdf.numPages }));
          booksAPI.update(bookId, { total_pages: pdf.numPages }).catch(() => {});
        }

        // Fetch page 1 dimensions to set base page size
        const firstPage = await pdf.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1.0 });
        setBasePageSize({ width: baseViewport.width, height: baseViewport.height });
      } catch (err) {
        console.error('Failed to load PDF document pages:', err);
        setError('Failed to parse PDF document. Access credentials might be invalid.');
      } finally {
        setLoading(false);
      }
    };
    loadPDFDoc();
  }, [pdfjsLoaded, pdfUrl]);

  // Handle initial scroll to the saved page once the PDF is loaded and containers are rendered
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  
  useEffect(() => {
    if (totalPages > 0 && !initialScrollDone) {
      // Use a small timeout to let the browser paint the page containers and calculate their offsets
      setTimeout(() => {
        const startPage = currentPageRef.current;
        const pageEl = pageRefs.current[startPage];
        if (pageEl && scrollContainerRef.current) {
          // Use 'auto' behavior for the initial load so it jumps instantly without a smooth-scroll animation
          scrollContainerRef.current.scrollTo({
            top: pageEl.offsetTop - 24, // Account for padding
            behavior: 'auto'
          });
          setInitialScrollDone(true);
        }
      }, 50);
    }
  }, [totalPages, initialScrollDone]);

  // Compute fit to width scale factor
  const calculateFitScale = () => {
    if (!scrollContainerRef.current || basePageSize.width === 0) return 1.0;
    const containerWidth = scrollContainerRef.current.clientWidth;
    // Account for 48px padding gutter inside scroll container
    const availableWidth = Math.max(200, containerWidth - 48);
    return availableWidth / basePageSize.width;
  };

  // Automatically adjust scale when base page size is loaded
  useEffect(() => {
    if (basePageSize.width > 0 && isFitWidth && scrollContainerRef.current) {
      const fitScale = calculateFitScale();
      setZoomScale(fitScale);
    }
  }, [basePageSize]);

  // Handle window resizing to adjust fit scale
  useEffect(() => {
    const handleResize = () => {
      if (isFitWidth) {
        const fitScale = calculateFitScale();
        setZoomScale(fitScale);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [basePageSize, isFitWidth]);

  const renderPage = async (pageNum) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = document.getElementById(`pdf-canvas-${pageNum}`);
      if (!canvas) return;

      const context = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      // Multiply rendering scale by DPR for crisp high-DPI resolution
      const viewport = page.getViewport({ scale: zoomScale * dpr });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Constrain visual size via CSS width/height to match standard zoomScale layout dimensions
      const normalViewport = page.getViewport({ scale: zoomScale });
      canvas.style.width = `${normalViewport.width}px`;
      canvas.style.height = `${normalViewport.height}px`;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await page.render(renderContext).promise;
    } catch (e) {
      console.error('Error rendering page:', pageNum, e);
    }
  };

  // Trigger lazy rendering of page canvases when visibility is toggled
  useEffect(() => {
    if (!pdfDoc) return;
    Object.keys(visiblePages).forEach((pageNumStr) => {
      const pageNum = parseInt(pageNumStr);
      if (visiblePages[pageNum] && !renderedPages.current[pageNum]) {
        renderedPages.current[pageNum] = true;
        renderPage(pageNum);
      }
    });
  }, [visiblePages, pdfDoc, zoomScale]);

  // Reset rendered states when zoom changes
  useEffect(() => {
    renderedPages.current = {};
  }, [zoomScale]);

  // Observer to track scrolls and active page calculations
  useEffect(() => {
    if (!pdfDoc || totalPages === 0 || !initialScrollDone) return;

    const observerOptions = {
      root: scrollContainerRef.current,
      threshold: [0.0, 0.25, 0.5, 0.75, 1.0],
      rootMargin: '20px 0px 20px 0px'
    };

    const visiblePageRatios = {};

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const pageNum = parseInt(entry.target.getAttribute('data-page'));
        visiblePageRatios[pageNum] = entry.intersectionRatio;

        if (entry.isIntersecting) {
          setVisiblePages((prev) => ({ ...prev, [pageNum]: true }));
        }
      });

      // Find page with the highest overlap ratio
      let maxRatio = -1;
      let activePage = currentPageRef.current;

      Object.keys(visiblePageRatios).forEach((pageNumStr) => {
        const pageNum = parseInt(pageNumStr);
        const ratio = visiblePageRatios[pageNum];
        if (ratio > maxRatio && ratio > 0.05) {
          maxRatio = ratio;
          activePage = pageNum;
        }
      });

      if (activePage !== currentPageRef.current && activePage >= 1 && activePage <= totalPages) {
        setCurrentPage(activePage);
        syncProgress(activePage);
      }
    }, observerOptions);

    const elements = document.querySelectorAll('.pdf-page-container');
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, totalPages, zoomScale, initialScrollDone]);

  const scrollToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    const pageEl = pageRefs.current[pageNum];
    if (pageEl && scrollContainerRef.current) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const lastAttemptedSyncPage = useRef(null);

  const syncProgress = (pageToSync) => {
    // 0. Safety guard: never sync if we haven't even loaded the initial saved page
    if (!initialPageLoaded) return;

    // 1. Guard against invalid states or out-of-range values
    if (!pageToSync || pageToSync < 1 || pageToSync > totalPages) {
      return;
    }
    
    // Check against backend's total_pages to prevent 400 Bad Request
    const backendTotal = book?.total_pages;
    if (backendTotal === null || (backendTotal && pageToSync > backendTotal)) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Throttle progress sync
    debounceTimerRef.current = setTimeout(async () => {
      // Don't retry the exact same bad request in a loop
      if (lastAttemptedSyncPage.current === pageToSync) return;
      
      try {
        lastAttemptedSyncPage.current = pageToSync;
        await booksAPI.updateProgress(bookId, pageToSync);
      } catch (err) {
        console.error('Failed to sync reading progress:', err);
      }
    }, 2000);
  };

  const zoomIn = () => {
    setIsFitWidth(false);
    setZoomScale((prev) => Math.min(prev + 0.25, 2.0));
  };

  const zoomOut = () => {
    setIsFitWidth(false);
    setZoomScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const toggleFitWidth = () => {
    setIsFitWidth(true);
    const fitScale = calculateFitScale();
    setZoomScale(fitScale);
  };

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const layoutWidth = basePageSize.width * zoomScale;
  const layoutHeight = basePageSize.height * zoomScale;

  if (loading && !pdfDoc) {
    return <Loading message="Opening digital library reader..." fullPage={true} />;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-lg border border-hairline shadow-md text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-ink mb-2">Unable to load document</h2>
        <p className="text-xs text-ink-muted mb-6 leading-relaxed">{error}</p>
        <button onClick={() => navigate('/books')} className="btn-primary mt-4">
          Return to Library
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-xl text-white">
      {/* Top Header Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/books')}
            className="text-xs font-bold text-slate-400 hover:text-white bg-slate-800 px-3.5 py-2 rounded-lg transition-colors"
          >
            ← Exit Reader
          </button>
          <div>
            <h1 className="text-sm font-bold tracking-tight line-clamp-1">{book?.title}</h1>
            <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">by {book?.author}</p>
          </div>
        </div>

        {/* Reading Progress Controls */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg">
            <button
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="text-slate-400 hover:text-white disabled:opacity-20 font-bold px-1.5 py-0.5 rounded transition-colors"
              title="Previous Page"
            >
              ◀
            </button>
            
            <div className="flex items-center text-xs font-bold text-slate-300 space-x-1.5">
              <span>Page</span>
              <input
                type="number"
                min="1"
                max={totalPages || 9999}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) scrollToPage(val);
                }}
                className="w-14 text-center bg-slate-950 border border-slate-800 rounded px-1.5 py-1 focus:outline-none focus:border-accent text-white font-bold text-xs"
              />
              <span className="text-slate-500">of {totalPages || '?'}</span>
            </div>

            <button
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={totalPages > 0 && currentPage >= totalPages}
              className="text-slate-400 hover:text-white disabled:opacity-20 font-bold px-1.5 py-0.5 rounded transition-colors"
              title="Next Page"
            >
              ▶
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-lg text-xs">
            <button 
              onClick={toggleFitWidth} 
              className={`px-2 py-0.5 rounded transition-colors font-semibold ${
                isFitWidth ? 'text-accent' : 'text-slate-400 hover:text-white'
              }`}
              title="Fit Width"
            >
              Fit Width
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={zoomOut} className="px-2 py-0.5 text-slate-400 hover:text-white font-semibold" title="Zoom Out">-</button>
            <span className="text-slate-300 font-medium font-mono">{Math.round(zoomScale * 100)}%</span>
            <button onClick={zoomIn} className="px-2 py-0.5 text-slate-400 hover:text-white font-semibold" title="Zoom In">+</button>
          </div>

          {totalPages > 0 && (
            <div className="hidden sm:flex items-center space-x-2.5 w-40">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 bg-accent`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 w-10 text-right">{progressPercent}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Viewport split screen */}
      <div className="flex flex-1 overflow-hidden bg-slate-900">
        {/* Left Sidebar Thumbnail Rail */}
        {totalPages > 0 && (
          <div className="w-40 bg-slate-950 border-r border-slate-800 overflow-y-auto flex-shrink-0 flex flex-col p-4 space-y-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                onClick={() => scrollToPage(pageNum)}
                className={`cursor-pointer border-2 p-2 rounded-lg transition-colors flex flex-col items-center ${
                  currentPage === pageNum
                    ? 'border-accent bg-accent/5'
                    : 'border-transparent hover:border-slate-800 bg-slate-900/40'
                }`}
              >
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Page {pageNum}</span>
                <div className="w-20 aspect-[3/4] bg-slate-800 border border-slate-700 rounded shadow-inner flex items-center justify-center text-xs font-semibold text-slate-400">
                  {pageNum}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Canvas Scroll Area */}
        <div 
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto scroll-smooth p-6 bg-slate-800/50 flex flex-col items-center space-y-6 transition-opacity duration-300 ${initialScrollDone ? 'opacity-100' : 'opacity-0'}`}
        >
          {pdfUrl ? (
            Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                ref={(el) => (pageRefs.current[pageNum] = el)}
                data-page={pageNum}
                className="pdf-page-container border border-slate-800 bg-white rounded-lg shadow-lg relative flex items-center justify-center"
                style={{
                  minHeight: `${layoutHeight}px`,
                  width: `${layoutWidth}px`,
                }}
              >
                {visiblePages[pageNum] ? (
                  <canvas 
                    id={`pdf-canvas-${pageNum}`} 
                    className="rounded-lg max-w-full shadow-md"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-semibold">
                    Page {pageNum}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-sm font-semibold">PDF document source url is unavailable.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFReader;
