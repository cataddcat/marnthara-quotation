// src/components/ui/GlobalErrorGuard.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorGuard extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('💥 Uncaught error:', error, errorInfo);
    // ในอนาคตคุณสามารถส่ง error ไปยัง Sentry หรือ Logging Service ได้ที่นี่
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background p-6 text-center space-y-6">
          {/* Icon Animation */}
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
            <div className="relative w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="space-y-2 max-w-sm mx-auto">
            <h1 className="text-lg font-bold text-foreground">
              ขออภัย เกิดข้อผิดพลาดบางอย่าง
            </h1>
            <p className="text-muted-foreground text-sm">
              ระบบพบปัญหาที่ไม่คาดคิด (Unexpected Error)
              <br />
              กรุณาลองโหลดหน้าใหม่อีกครั้ง
            </p>
          </div>

          {/* Technical Info (Development Only) */}
          {import.meta.env.DEV && this.state.error && (
            <div className="w-full max-w-md bg-slate-950 text-red-400 p-4 rounded-lg text-xs font-mono text-left overflow-auto max-h-40 border border-red-900/50">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button 
              onClick={this.handleReload} 
              className="w-full bg-primary text-primary-foreground"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={1.5} /> โหลดหน้าใหม่
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={this.handleClearCache}
              className="text-muted-foreground hover:text-destructive text-xs"
            >
              ล้างข้อมูลและรีเซ็ตระบบ (กรณีค้างหนัก)
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}