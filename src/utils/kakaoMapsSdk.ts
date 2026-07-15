export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoLatLngBounds {
  extend(position: KakaoLatLng): void;
}

export interface KakaoMapInstance {
  getLevel(): number;
  panTo(position: KakaoLatLng): void;
  relayout(): void;
  setBounds(bounds: KakaoLatLngBounds): void;
  setCenter(position: KakaoLatLng): void;
  setLevel(level: number): void;
}

export interface KakaoCustomOverlayInstance {
  setMap(map: KakaoMapInstance | null): void;
}

export interface KakaoRegionCodeResult {
  code: string;
  region_type: "H" | "B" | string;
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  region_4depth_name: string;
  x: number;
  y: number;
}

interface KakaoMapConstructor {
  new (
    container: HTMLElement,
    options: {
      center: KakaoLatLng;
      level: number;
      draggable?: boolean;
      scrollwheel?: boolean;
    },
  ): KakaoMapInstance;
}

interface KakaoLatLngConstructor {
  new (latitude: number, longitude: number): KakaoLatLng;
}

interface KakaoLatLngBoundsConstructor {
  new (): KakaoLatLngBounds;
}

interface KakaoCustomOverlayConstructor {
  new (options: {
    position: KakaoLatLng;
    content: HTMLElement;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
    clickable?: boolean;
  }): KakaoCustomOverlayInstance;
}

interface KakaoGeocoderInstance {
  coord2RegionCode(
    longitude: number,
    latitude: number,
    callback: (result: KakaoRegionCodeResult[], status: string) => void,
  ): void;
}

interface KakaoGeocoderConstructor {
  new (): KakaoGeocoderInstance;
}

export interface KakaoMapsServices {
  Geocoder: KakaoGeocoderConstructor;
  Status: {
    OK: string;
  };
}

export interface KakaoMapsSdk {
  load(callback: () => void): void;
  Map: KakaoMapConstructor;
  LatLng: KakaoLatLngConstructor;
  LatLngBounds: KakaoLatLngBoundsConstructor;
  CustomOverlay: KakaoCustomOverlayConstructor;
  services?: KakaoMapsServices;
}

declare global {
  interface Window {
    kakao?: {
      maps?: KakaoMapsSdk;
    };
  }
}

const KAKAO_MAP_SCRIPT_ID = "kakao-maps-javascript-sdk";
const KAKAO_MAP_LOAD_TIMEOUT_MS = 10_000;
let kakaoMapsPromise: Promise<KakaoMapsSdk> | null = null;

function currentKakaoMapsSdk(): KakaoMapsSdk | null {
  return window.kakao?.maps ?? null;
}

function activateKakaoMapsSdk(
  resolve: (sdk: KakaoMapsSdk) => void,
  reject: (reason: Error) => void,
) {
  const sdk = currentKakaoMapsSdk();
  if (!sdk || typeof sdk.load !== "function") {
    reject(new Error("Kakao Maps SDK namespace is unavailable."));
    return;
  }

  sdk.load(() => {
    const readySdk = currentKakaoMapsSdk();
    if (!readySdk || typeof readySdk.Map !== "function") {
      reject(new Error("Kakao Maps SDK did not finish loading."));
      return;
    }
    resolve(readySdk);
  });
}

function reusableScript(appKey: string): HTMLScriptElement | null {
  const script = document.getElementById(
    KAKAO_MAP_SCRIPT_ID,
  ) as HTMLScriptElement | null;
  if (!script) return null;

  const failed = script.dataset.loaded === "false";
  const keyChanged = Boolean(script.dataset.appKey && script.dataset.appKey !== appKey);
  if (failed || keyChanged) {
    script.remove();
    return null;
  }
  return script;
}

export function loadKakaoMapsSdk(appKey: string): Promise<KakaoMapsSdk> {
  const normalizedKey = String(appKey ?? "").trim();
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Kakao Maps SDK requires a browser."));
  }
  if (!normalizedKey) {
    return Promise.reject(new Error("VITE_KAKAO_MAP_APP_KEY is not configured."));
  }
  if (kakaoMapsPromise) return kakaoMapsPromise;

  kakaoMapsPromise = new Promise<KakaoMapsSdk>((resolve, reject) => {
    let settled = false;
    let timeoutId = 0;
    const finishResolve = (sdk: KakaoMapsSdk) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(sdk);
    };
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(error);
    };
    timeoutId = window.setTimeout(
      () => finishReject(new Error("Kakao Maps SDK load timed out.")),
      KAKAO_MAP_LOAD_TIMEOUT_MS,
    );

    if (currentKakaoMapsSdk()) {
      activateKakaoMapsSdk(finishResolve, finishReject);
      return;
    }

    const existingScript = reusableScript(normalizedKey);
    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => {
      script.dataset.loaded = "true";
      activateKakaoMapsSdk(finishResolve, finishReject);
    };
    const handleError = () => {
      script.dataset.loaded = "false";
      finishReject(new Error("Kakao Maps SDK script failed to load."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.id = KAKAO_MAP_SCRIPT_ID;
      script.async = true;
      script.dataset.appKey = normalizedKey;
      script.referrerPolicy = "strict-origin-when-cross-origin";
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(normalizedKey)}&autoload=false&libraries=services`;
      document.head.appendChild(script);
    } else if (script.dataset.loaded === "true") {
      handleLoad();
    }
  }).catch((error: unknown) => {
    kakaoMapsPromise = null;
    throw error;
  });

  return kakaoMapsPromise;
}
