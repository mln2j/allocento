import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  const skipLoader = req.headers.has('X-Skip-Loader') || req.method === 'GET';

  if (skipLoader) {
    const cleanedReq = req.clone({
      headers: req.headers.has('X-Skip-Loader') ? req.headers.delete('X-Skip-Loader') : req.headers
    });
    return next(cleanedReq);
  }

  loadingService.show();

  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
