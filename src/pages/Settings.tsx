import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { useThemeStore, type ThemeMode } from '@/state/themeStore';

export function Settings() {
  const { theme, density, setTheme, setDensity } = useThemeStore();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted">Customize your reading experience</p>
      </div>

      <div className="space-y-6">
        <Panel elevation="soft">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">Theme Mode</label>
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'sepia'] as const).map((mode) => (
                  <ThemeOption
                    key={mode}
                    mode={mode}
                    active={theme === mode}
                    onClick={() => setTheme(mode)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Density</label>
              <div className="grid grid-cols-3 gap-3">
                {(['compact', 'standard', 'cozy'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className="p-3 rounded-lg border transition-base text-left capitalize"
                    style={{
                      borderColor:
                        density === d ? 'var(--color-accent)' : 'var(--color-border)',
                      backgroundColor:
                        density === d ? 'var(--color-accent-soft)' : 'transparent',
                    }}
                  >
                    <div className="text-sm font-medium">{d}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel elevation="soft">
          <h2 className="text-xl font-semibold mb-4">Reading Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Auto-save Progress</p>
                <p className="text-sm text-muted">Automatically save your reading position</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Show Page Numbers</p>
                <p className="text-sm text-muted">Display page numbers in the reader</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Smooth Transitions</p>
                <p className="text-sm text-muted">Enable page turn animations</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </div>
          </div>
        </Panel>

        <Panel elevation="soft">
          <h2 className="text-xl font-semibold mb-4">Data Management</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Storage Used</p>
                <p className="text-sm text-muted">0 MB of available space</p>
              </div>
              <Button variant="outline" size="sm">
                Clear Cache
              </Button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Export Library</p>
                <p className="text-sm text-muted">Download your library metadata as JSON</p>
              </div>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Reset Settings</p>
                <p className="text-sm text-muted">Restore default settings</p>
              </div>
              <Button variant="outline" size="sm">
                Reset
              </Button>
            </div>
          </div>
        </Panel>

        <div className="flex justify-end">
          <Button variant="primary">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

interface ThemeOptionProps {
  mode: ThemeMode;
  active: boolean;
  onClick: () => void;
}

function ThemeOption({ mode, active, onClick }: ThemeOptionProps) {
  const labels: Record<ThemeMode, string> = {
    light: 'Light',
    dark: 'Dark',
    sepia: 'Sepia',
  };

  const previews: Record<ThemeMode, { bg: string; text: string }> = {
    light: { bg: '#f7f8fb', text: '#1f2933' },
    dark: { bg: '#0f172a', text: '#f7f8fb' },
    sepia: { bg: '#fdf7f0', text: '#3f2f23' },
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-3 rounded-lg border transition-base"
      style={{
        borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
        backgroundColor: active ? 'var(--color-accent-soft)' : 'transparent',
      }}
    >
      <div
        className="h-16 w-full rounded border"
        style={{
          backgroundColor: previews[mode].bg,
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="p-2">
          <div
            className="h-2 w-8 rounded"
            style={{ backgroundColor: previews[mode].text }}
          />
          <div
            className="h-1.5 w-12 rounded mt-2"
            style={{ backgroundColor: previews[mode].text, opacity: 0.5 }}
          />
        </div>
      </div>
      <span className="text-sm font-medium">{labels[mode]}</span>
    </button>
  );
}
