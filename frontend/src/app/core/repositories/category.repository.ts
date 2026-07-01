import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, tap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceService } from '../services/workspace.service';
import { AppInitializerService } from '../services/app-initializer';
import { LocalDbService } from '../services/local-db';
import { Category, CategoryDetailsResponse } from '../models/category.model';
export type { Category, CategoryDetailsResponse };

@Injectable({
  providedIn: 'root'
})
export class CategoryRepository {
  private http = inject(HttpClient);
  private workspaceService = inject(WorkspaceService);
  private appInitializer = inject(AppInitializerService);
  private localDb = inject(LocalDbService);
  private apiUrl = `${environment.apiBaseUrl}/categories`;

  getAll(): Observable<Category[]> {
    if (!this.appInitializer.isOnlineMode) {
      return from(this.localDb.getAll('categories'));
    }
    return this.http.get<Category[]>(this.apiUrl).pipe(
      tap(async (categories) => {
        try {
          await this.localDb.clearStore('categories');
          for (const cat of categories) {
            await this.localDb.put('categories', cat);
          }
        } catch (e) {
          console.warn('Failed to cache categories', e);
        }
      }),
      catchError(() => from(this.localDb.getAll('categories')))
    );
  }

  getById(id: number): Observable<CategoryDetailsResponse> {
    if (!this.appInitializer.isOnlineMode) {
      return from((async () => {
        const categories = await this.localDb.getAll('categories');
        const cat = categories.find(c => c.id === id);
        if (!cat) throw new Error('Category not found offline.');
        return { category: cat, transactions: [] } as any;
      })());
    }
    return this.http.get<CategoryDetailsResponse>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Category>): Observable<Category> {
    if (!this.appInitializer.isOnlineMode) {
      const localId = -Date.now();
      const localCat: Category = {
        id: localId,
        workspace_id: this.workspaceService.activeWorkspace()?.id || 0,
        name: data.name || '',
        type: data.type || 'expense'
      };
      
      return from((async () => {
        await this.localDb.put('categories', localCat);
        await this.localDb.put('offline_queue', {
          entity: 'category',
          action: 'create',
          entity_id: localId,
          payload: data
        });
        return localCat;
      })());
    }

    return this.http.post<Category>(this.apiUrl, data).pipe(
      tap(async (cat) => await this.localDb.put('categories', cat))
    );
  }

  update(id: number, data: Partial<Category>): Observable<Category> {
    if (!this.appInitializer.isOnlineMode) {
      return from((async () => {
        const categories = await this.localDb.getAll('categories');
        const cat = categories.find(c => c.id === id);
        if (!cat) throw new Error('Category not found offline.');
        
        const updated = { ...cat, ...data };
        await this.localDb.put('categories', updated);
        await this.localDb.put('offline_queue', {
          entity: 'category',
          action: 'update',
          entity_id: id,
          payload: data
        });
        return updated;
      })());
    }

    return this.http.put<Category>(`${this.apiUrl}/${id}`, data).pipe(
      tap(async (cat) => await this.localDb.put('categories', cat))
    );
  }

  delete(id: number): Observable<void> {
    if (!this.appInitializer.isOnlineMode) {
      return from((async () => {
        await this.localDb.delete('categories', id);
        await this.localDb.put('offline_queue', {
          entity: 'category',
          action: 'delete',
          entity_id: id
        });
      })());
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(async () => await this.localDb.delete('categories', id))
    );
  }

  merge(fromId: number, toId: number): Observable<any> {
    if (!this.appInitializer.isOnlineMode) {
      // Merge offline is tricky, just log and skip for now or throw
      return from(Promise.reject(new Error('Cannot merge categories in offline mode.')));
    }
    return this.http.post(`${this.apiUrl}/${fromId}/merge-into/${toId}`, {});
  }
}
