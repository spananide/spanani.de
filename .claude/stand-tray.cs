using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Forms;
using System.Windows.Input;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;
using Microsoft.Win32;

using Application = System.Windows.Application;
using Clipboard = System.Windows.Forms.Clipboard;
using KeyEventArgs = System.Windows.Input.KeyEventArgs;
using MouseEventArgs = System.Windows.Forms.MouseEventArgs;
using Orientation = System.Windows.Controls.Orientation;
using FlowDirection = System.Windows.FlowDirection;
using Path = System.IO.Path;
using Brush = System.Windows.Media.Brush;
using FontFamily = System.Windows.Media.FontFamily;
using Point = System.Windows.Point;
using Run = System.Windows.Documents.Run;
using TextElement = System.Windows.Documents.TextElement;

[assembly: AssemblyTitle("Claude Stand")]
[assembly: AssemblyProduct("Claude Stand")]
[assembly: AssemblyDescription("Claude-Limits und Verbrauch im Infobereich")]

namespace ClaudeStand {
    class LimitResult {
        public int? Pct;
        public long? Reset;
    }

    class Session {
        public string Id;
        public string Name;
        public string Project;
        public string Model;
        public long Updated;
        public double Cost;
        public long In;
        public long Out;
        public int? Five;
        public long? FiveReset;
        public int? Week;
        public long? WeekReset;
        public Dictionary<string, double[]> Hours;

        public Session() {
            Hours = new Dictionary<string, double[]>();
        }
    }

    class CacheEntry {
        public DateTime LastWriteTimeUtc;
        public Session Session;
    }

    class StandResult {
        public LimitResult Five;
        public LimitResult Week;
        public double TodayCost;
        public long TodayTokens;
        public double WeekCost;
        public long WeekTokens;
        public Dictionary<string, double> Costs;
        public Session Last;

        public StandResult() {
            Costs = new Dictionary<string, double>();
        }
    }

    class Sample {
        public long T;
        public Dictionary<string, double> Costs;

        public Sample(long t, Dictionary<string, double> costs) {
            T = t;
            Costs = costs;
        }
    }

    static class Program {
        [DllImport("user32.dll")]
        public static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        public static extern bool DestroyIcon(IntPtr handle);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetClassName(IntPtr hwnd, StringBuilder name, int max);

        static Mutex appMutex;
        static EventWaitHandle openEvent;
        static Window win;
        static NotifyIcon trayIcon;
        static IntPtr oldIconHandle = IntPtr.Zero;

        static TranslateTransform uiSchub;
        static Run uiFuenfZahl;
        static Run uiFuenfUebrig;
        static ColumnDefinition uiFuenfFillCol;
        static ColumnDefinition uiFuenfRestCol;
        static Border uiFuenfFill;
        static Run uiFuenfReicht;
        static Run uiFuenfVoll;

        static Run uiWocheZahl;
        static Run uiWocheUebrig;
        static ColumnDefinition uiWocheFillCol;
        static ColumnDefinition uiWocheRestCol;
        static Border uiWocheFill;
        static TextBlock uiWocheBereich;

        static TextBlock uiAktivZeile;
        static TextBlock uiHeuteGeld;
        static TextBlock uiHeuteTokens;
        static TextBlock uiWocheGeld;
        static TextBlock uiWocheTokens;
        static System.Windows.Controls.Button uiSchluessel;
        static System.Windows.Controls.Button uiOeffnen;

        static Dictionary<string, CacheEntry> cache = new Dictionary<string, CacheEntry>();
        static List<Sample> samples = new List<Sample>();
        static List<KeyValuePair<DateTime, double>> fiveSamples = new List<KeyValuePair<DateTime, double>>();
        static long? lastFiveReset;
        static StandResult currentStand;
        static string iconText = null;
        static DateTime toggled = DateTime.MinValue;
        static DateTime left = DateTime.MinValue;
        static DispatcherTimer zuTimer;

        static readonly CultureInfo de = CultureInfo.GetCultureInfo("de-DE");
        static readonly string standUrl = "https://spanani.de/c-r8kq2wv5zn/";
        static string store;
        static Dictionary<string, string> currentFarben;

        static readonly Dictionary<string, string> FarbenDunkel = new Dictionary<string, string> {
            { "Grund", "#16191d" },
            { "Text", "#ece8df" },
            { "Leise", "#9aa0a6" },
            { "Linie", "#2e333a" },
            { "Spur", "#2a2f35" },
            { "Tank", "#ece6d6" },
            { "Gelb", "#f0a020" },
            { "Rot", "#e5484d" }
        };

        static readonly Dictionary<string, string> FarbenHell = new Dictionary<string, string> {
            { "Grund", "#f4f2ed" },
            { "Text", "#1d2125" },
            { "Leise", "#5d636a" },
            { "Linie", "#dcd8cf" },
            { "Spur", "#e3dfd6" },
            { "Tank", "#23272c" },
            { "Gelb", "#a85f00" },
            { "Rot", "#c8333a" }
        };

        const string WindowXaml = @"<Window xmlns=""http://schemas.microsoft.com/winfx/2006/xaml/presentation""
        xmlns:x=""http://schemas.microsoft.com/winfx/2006/xaml""
        Title=""Claude Stand"" Width=""340"" SizeToContent=""Height"" WindowStyle=""None"" AllowsTransparency=""True""
        Background=""Transparent"" ResizeMode=""NoResize"" ShowInTaskbar=""False"" Topmost=""True"" Left=""-3000"" Top=""0""
        FontFamily=""Segoe UI Variable Text, Segoe UI"" FontSize=""13"" Foreground=""{DynamicResource Text}""
        Typography.NumeralAlignment=""Tabular"" UseLayoutRounding=""True"">
  <Window.Resources>
    <Style x:Key=""TextLink"" TargetType=""Button"">
      <Setter Property=""Foreground"" Value=""{DynamicResource Leise}""/>
      <Setter Property=""Background"" Value=""Transparent""/>
      <Setter Property=""BorderThickness"" Value=""1""/>
      <Setter Property=""BorderBrush"" Value=""Transparent""/>
      <Setter Property=""Cursor"" Value=""Hand""/>
      <Setter Property=""FontSize"" Value=""13""/>
      <Setter Property=""FocusVisualStyle"" Value=""{x:Null}""/>
      <Setter Property=""Padding"" Value=""2,1""/>
      <Setter Property=""Template"">
        <Setter.Value>
          <ControlTemplate TargetType=""Button"">
            <Border x:Name=""B"" Background=""{TemplateBinding Background}"" BorderBrush=""{TemplateBinding BorderBrush}"" BorderThickness=""{TemplateBinding BorderThickness}"" CornerRadius=""3"" Padding=""{TemplateBinding Padding}"">
              <TextBlock x:Name=""T"" Text=""{TemplateBinding Content}"" Foreground=""{TemplateBinding Foreground}""/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property=""IsMouseOver"" Value=""True"">
                <Setter TargetName=""T"" Property=""TextDecorations"" Value=""Underline""/>
                <Setter Property=""Foreground"" Value=""{DynamicResource Text}""/>
              </Trigger>
              <Trigger Property=""IsKeyboardFocused"" Value=""True"">
                <Setter TargetName=""B"" Property=""BorderBrush"" Value=""{DynamicResource Linie}""/>
                <Setter Property=""Foreground"" Value=""{DynamicResource Text}""/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>
  <Grid Margin=""16"">
    <Grid.RenderTransform><TranslateTransform x:Name=""Schub""/></Grid.RenderTransform>
    <Border Background=""{DynamicResource Grund}"" CornerRadius=""12"">
      <Border.Effect><DropShadowEffect BlurRadius=""24"" ShadowDepth=""5"" Direction=""270"" Opacity=""0.45"" Color=""Black""/></Border.Effect>
    </Border>
    <Border BorderBrush=""{DynamicResource Linie}"" BorderThickness=""1"" CornerRadius=""12"" Padding=""20"">
      <StackPanel>
        <DockPanel LastChildFill=""False"">
          <TextBlock DockPanel.Dock=""Left"" Text=""5 Stunden"" FontSize=""15"" FontWeight=""SemiBold"" Foreground=""{DynamicResource Text}"" VerticalAlignment=""Center""/>
          <TextBlock DockPanel.Dock=""Right"" HorizontalAlignment=""Right"" VerticalAlignment=""Center"">
            <Run x:Name=""FuenfZahl"" FontFamily=""Segoe UI Variable Display, Segoe UI"" FontSize=""40"" FontWeight=""SemiBold"" Foreground=""{DynamicResource Text}"" Text=""–""/><Run x:Name=""FuenfUebrig"" FontSize=""13"" Foreground=""{DynamicResource Leise}"" Text=""""/>
          </TextBlock>
        </DockPanel>
        <Grid Height=""10"" Margin=""0,8,0,0"">
          <Border Background=""{DynamicResource Spur}"" CornerRadius=""5""/>
          <Grid x:Name=""FuenfFillGrid"">
            <Grid.ColumnDefinitions>
              <ColumnDefinition x:Name=""FuenfFillCol"" Width=""0*""/>
              <ColumnDefinition x:Name=""FuenfRestCol"" Width=""100*""/>
            </Grid.ColumnDefinitions>
            <Border x:Name=""FuenfFill"" Background=""{DynamicResource Tank}"" CornerRadius=""5""/>
          </Grid>
        </Grid>
        <TextBlock x:Name=""FuenfBereich"" Margin=""0,7,0,0"" FontSize=""13"">
          <Run x:Name=""FuenfReicht"" FontWeight=""SemiBold""/><Run x:Name=""FuenfVoll"" Foreground=""{DynamicResource Leise}""/>
        </TextBlock>

        <DockPanel Margin=""0,18,0,0"" LastChildFill=""False"">
          <TextBlock DockPanel.Dock=""Left"" Text=""Woche"" FontSize=""15"" FontWeight=""SemiBold"" Foreground=""{DynamicResource Text}"" VerticalAlignment=""Center""/>
          <TextBlock DockPanel.Dock=""Right"" HorizontalAlignment=""Right"" VerticalAlignment=""Center"">
            <Run x:Name=""WocheZahl"" FontFamily=""Segoe UI Variable Display, Segoe UI"" FontSize=""40"" FontWeight=""SemiBold"" Foreground=""{DynamicResource Text}"" Text=""–""/><Run x:Name=""WocheUebrig"" FontSize=""13"" Foreground=""{DynamicResource Leise}"" Text=""""/>
          </TextBlock>
        </DockPanel>
        <Grid Height=""10"" Margin=""0,8,0,0"">
          <Border Background=""{DynamicResource Spur}"" CornerRadius=""5""/>
          <Grid x:Name=""WocheFillGrid"">
            <Grid.ColumnDefinitions>
              <ColumnDefinition x:Name=""WocheFillCol"" Width=""0*""/>
              <ColumnDefinition x:Name=""WocheRestCol"" Width=""100*""/>
            </Grid.ColumnDefinitions>
            <Border x:Name=""WocheFill"" Background=""{DynamicResource Tank}"" CornerRadius=""5""/>
          </Grid>
        </Grid>
        <TextBlock x:Name=""WocheBereich"" Margin=""0,7,0,0"" FontSize=""13"" Foreground=""{DynamicResource Leise}""/>

        <TextBlock x:Name=""AktivZeile"" Margin=""0,16,0,0"" FontSize=""13"" Foreground=""{DynamicResource Leise}"" TextTrimming=""CharacterEllipsis"" TextWrapping=""NoWrap"" Visibility=""Collapsed""/>

        <Rectangle Height=""1"" Fill=""{DynamicResource Linie}"" Margin=""0,14""/>

        <Grid>
          <Grid.ColumnDefinitions>
            <ColumnDefinition Width=""*""/>
            <ColumnDefinition Width=""Auto""/>
            <ColumnDefinition Width=""Auto"" MinWidth=""110""/>
          </Grid.ColumnDefinitions>
          <Grid.RowDefinitions>
            <RowDefinition/>
            <RowDefinition Height=""6""/>
            <RowDefinition/>
          </Grid.RowDefinitions>
          <TextBlock Text=""Heute"" FontSize=""14"" Foreground=""{DynamicResource Text}""/>
          <TextBlock x:Name=""HeuteGeld"" Grid.Column=""1"" FontSize=""14"" FontWeight=""SemiBold"" Foreground=""{DynamicResource Text}"" TextAlignment=""Right""/>
          <TextBlock x:Name=""HeuteTokens"" Grid.Column=""2"" Margin=""12,0,0,0"" FontSize=""14"" Foreground=""{DynamicResource Leise}"" TextAlignment=""Right""/>
          <TextBlock Grid.Row=""2"" Text=""Diese Woche"" FontSize=""14"" Foreground=""{DynamicResource Text}""/>
          <TextBlock x:Name=""WocheGeld"" Grid.Row=""2"" Grid.Column=""1"" FontSize=""14"" FontWeight=""SemiBold"" Foreground=""{DynamicResource Text}"" TextAlignment=""Right""/>
          <TextBlock x:Name=""WocheTokens"" Grid.Row=""2"" Grid.Column=""2"" Margin=""12,0,0,0"" FontSize=""14"" Foreground=""{DynamicResource Leise}"" TextAlignment=""Right""/>
        </Grid>

        <DockPanel Margin=""0,14,0,0"" LastChildFill=""False"">
          <Button x:Name=""Schluessel"" DockPanel.Dock=""Left"" Style=""{StaticResource TextLink}"" Content=""Schlüssel kopieren""/>
          <Button x:Name=""Oeffnen"" DockPanel.Dock=""Right"" Style=""{StaticResource TextLink}"" Content=""Stand öffnen""/>
        </DockPanel>
      </StackPanel>
    </Border>
  </Grid>
</Window>";

        static string GetDataFolder() {
            string env = Environment.GetEnvironmentVariable("CLAUDE_STAND_DIR");
            if (!string.IsNullOrEmpty(env)) {
                return env;
            }
            string user = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            return Path.Combine(user, ".claude", "stand");
        }

        static string GetString(Dictionary<string, object> dict, string key) {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null) {
                return val.ToString();
            }
            return null;
        }

        static double GetDouble(Dictionary<string, object> dict, string key) {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null) {
                try { return Convert.ToDouble(val, CultureInfo.InvariantCulture); } catch {}
            }
            return 0.0;
        }

        static long GetLong(Dictionary<string, object> dict, string key) {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null) {
                try { return Convert.ToInt64(val, CultureInfo.InvariantCulture); } catch {}
            }
            return 0L;
        }

        static int? GetNullableInt(Dictionary<string, object> dict, string key) {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null) {
                try { return (int)Math.Round(Convert.ToDouble(val, CultureInfo.InvariantCulture)); } catch {}
            }
            return null;
        }

        static long? GetNullableLong(Dictionary<string, object> dict, string key) {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null) {
                try { return Convert.ToInt64(val, CultureInfo.InvariantCulture); } catch {}
            }
            return null;
        }

        static Session ParseSession(string id, Dictionary<string, object> dict) {
            Session s = new Session();
            s.Id = id;
            s.Name = GetString(dict, "name");
            s.Project = GetString(dict, "project");
            s.Model = GetString(dict, "model");
            s.Updated = GetLong(dict, "updated");
            s.Cost = GetDouble(dict, "cost");
            s.In = GetLong(dict, "in");
            s.Out = GetLong(dict, "out");
            s.Five = GetNullableInt(dict, "five");
            s.FiveReset = GetNullableLong(dict, "fiveReset");
            s.Week = GetNullableInt(dict, "week");
            s.WeekReset = GetNullableLong(dict, "weekReset");

            object hoursObj;
            if (dict != null && dict.TryGetValue("hours", out hoursObj) && hoursObj is IDictionary) {
                IDictionary hMap = (IDictionary)hoursObj;
                foreach (DictionaryEntry de in hMap) {
                    string hourKey = de.Key != null ? de.Key.ToString() : null;
                    if (hourKey == null) continue;
                    IEnumerable list = de.Value as IEnumerable;
                    if (list != null) {
                        List<double> vals = new List<double>();
                        foreach (object item in list) {
                            try {
                                vals.Add(Convert.ToDouble(item, CultureInfo.InvariantCulture));
                            } catch {}
                        }
                        if (vals.Count >= 3) {
                            s.Hours[hourKey] = new double[] { vals[0], vals[1], vals[2] };
                        }
                    }
                }
            }
            return s;
        }

        static List<Session> ReadSessions(string dir, Dictionary<string, CacheEntry> sessionCache) {
            if (!Directory.Exists(dir)) {
                return new List<Session>();
            }
            string[] files;
            try {
                files = Directory.GetFiles(dir, "*.json");
            } catch {
                files = new string[0];
            }

            HashSet<string> currentFiles = new HashSet<string>(files);
            List<string> stale = new List<string>();
            foreach (string key in sessionCache.Keys) {
                if (!currentFiles.Contains(key)) {
                    stale.Add(key);
                }
            }
            foreach (string key in stale) {
                sessionCache.Remove(key);
            }

            JavaScriptSerializer serializer = new JavaScriptSerializer();
            foreach (string f in files) {
                FileInfo fi;
                try {
                    fi = new FileInfo(f);
                } catch {
                    continue;
                }

                CacheEntry entry;
                if (sessionCache.TryGetValue(f, out entry) && entry != null && entry.LastWriteTimeUtc == fi.LastWriteTimeUtc) {
                    continue;
                }

                try {
                    string content;
                    using (FileStream fs = new FileStream(f, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                    using (StreamReader sr = new StreamReader(fs, Encoding.UTF8)) {
                        content = sr.ReadToEnd();
                    }
                    Dictionary<string, object> dict = serializer.Deserialize<Dictionary<string, object>>(content);
                    if (dict != null) {
                        string id = Path.GetFileNameWithoutExtension(f);
                        Session s = ParseSession(id, dict);
                        sessionCache[f] = new CacheEntry { LastWriteTimeUtc = fi.LastWriteTimeUtc, Session = s };
                    }
                } catch {
                    // Keep last good copy when file does not parse
                }
            }

            List<Session> result = new List<Session>();
            foreach (CacheEntry ce in sessionCache.Values) {
                if (ce != null && ce.Session != null) {
                    result.Add(ce.Session);
                }
            }
            return result;
        }

        static LimitResult GetLimit(IEnumerable<Session> sessions, string pctKey, string resetKey, long now) {
            LimitResult res = new LimitResult();
            List<Session> withReset = new List<Session>();
            long top = long.MinValue, newest = long.MinValue;

            foreach (Session s in sessions) {
                long? r = (resetKey == "fiveReset") ? s.FiveReset : s.WeekReset;
                if (r.HasValue && r.Value > 0) {
                    withReset.Add(s);
                    // The window of the newest reading wins, like on the page; a stray report of another window is ignored.
                    if (s.Updated > newest) {
                        newest = s.Updated;
                        top = r.Value;
                    }
                }
            }

            if (withReset.Count == 0) {
                res.Pct = null;
                res.Reset = null;
                return res;
            }

            if (top <= now) {
                res.Pct = 0;
                res.Reset = null;
                return res;
            }

            double maxPct = double.MinValue;
            foreach (Session s in withReset) {
                long? r = (resetKey == "fiveReset") ? s.FiveReset : s.WeekReset;
                if (r.HasValue && Math.Abs(r.Value - top) <= 60) {
                    int? p = (pctKey == "five") ? s.Five : s.Week;
                    if (p.HasValue) {
                        if (p.Value > maxPct) {
                            maxPct = p.Value;
                        }
                    }
                }
            }

            res.Pct = maxPct > double.MinValue ? (int?)Math.Round(maxPct) : 0;
            res.Reset = top;
            return res;
        }

        static StandResult GetStand(IEnumerable<Session> sessions, long now) {
            LimitResult five = GetLimit(sessions, "five", "fiveReset", now);
            LimitResult week = GetLimit(sessions, "week", "weekReset", now);

            DateTime local = DateTimeOffset.FromUnixTimeSeconds(now).LocalDateTime;
            string today = local.ToString("yyyy-MM-dd");
            DateTime fromDt = (week.Reset.HasValue && week.Reset.Value > 0)
                ? DateTimeOffset.FromUnixTimeSeconds(week.Reset.Value - 604800).LocalDateTime
                : local.AddDays(-7);
            string from = fromDt.ToString("yyyy-MM-ddTHH");

            StandResult r = new StandResult();
            r.Five = five;
            r.Week = week;
            r.TodayCost = 0.0;
            r.TodayTokens = 0;
            r.WeekCost = 0.0;
            r.WeekTokens = 0;
            r.Last = null;

            foreach (Session s in sessions) {
                if (s.Id != null) {
                    r.Costs[s.Id] = s.Cost;
                }
                if (r.Last == null || s.Updated > r.Last.Updated) {
                    r.Last = s;
                }
                if (s.Hours != null) {
                    foreach (KeyValuePair<string, double[]> kvp in s.Hours) {
                        string name = kvp.Key;
                        double[] v = kvp.Value;
                        if (v != null && v.Length >= 3) {
                            if (name.StartsWith(today)) {
                                r.TodayCost += v[2];
                                r.TodayTokens += (long)(v[0] + v[1]);
                            }
                            if (string.CompareOrdinal(name, from) >= 0) {
                                r.WeekCost += v[2];
                                r.WeekTokens += (long)(v[0] + v[1]);
                            }
                        }
                    }
                }
            }
            return r;
        }

        static double? GetRate(IList<Sample> sampleList) {
            if (sampleList == null || sampleList.Count < 2 || (sampleList[sampleList.Count - 1].T - sampleList[0].T) < 60) {
                return null;
            }
            Dictionary<string, double> first = new Dictionary<string, double>();
            foreach (Sample x in sampleList) {
                if (x.Costs != null) {
                    foreach (KeyValuePair<string, double> kv in x.Costs) {
                        if (!first.ContainsKey(kv.Key)) {
                            first[kv.Key] = kv.Value;
                        }
                    }
                }
            }
            Sample last = sampleList[sampleList.Count - 1];
            double sum = 0.0;
            if (last.Costs != null) {
                foreach (KeyValuePair<string, double> kv in last.Costs) {
                    double firstVal;
                    if (first.TryGetValue(kv.Key, out firstVal)) {
                        sum += Math.Max(0.0, kv.Value - firstVal);
                    }
                }
            }
            return (sum / (last.T - sampleList[0].T)) * 3600.0;
        }

        static string FormatGeld(double v) {
            return v.ToString("#,0.00", de) + " $";
        }

        static string FormatTokens(double n) {
            if (n >= 1e9) {
                return (n / 1e9).ToString("0.0", de) + " Mrd.";
            }
            if (n >= 1e6) {
                return (n / 1e6).ToString("0.0", de) + " Mio.";
            }
            if (n >= 1e3) {
                return (n / 1e3).ToString("0", de) + " Tsd.";
            }
            return n.ToString("0", de);
        }

        static bool IsSystemLightTheme() {
            try {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")) {
                    if (key != null) {
                        object val = key.GetValue("SystemUsesLightTheme");
                        if (val != null && Convert.ToInt32(val) == 1) {
                            return true;
                        }
                    }
                }
            } catch {}
            return false;
        }

        static void SetTheme() {
            bool light = IsSystemLightTheme();
            Dictionary<string, string> theme = light ? FarbenHell : FarbenDunkel;
            currentFarben = theme;
            BrushConverter conv = new BrushConverter();
            foreach (KeyValuePair<string, string> kvp in theme) {
                win.Resources[kvp.Key] = (SolidColorBrush)conv.ConvertFromString(kvp.Value);
            }
        }

        static DateTime? Reicht(List<KeyValuePair<DateTime, double>> samples, DateTime now, DateTime reset) {
            if (samples == null || samples.Count < 2) return null;
            DateTime firstTime = samples[0].Key;
            DateTime lastTime = samples[samples.Count - 1].Key;
            TimeSpan span = lastTime - firstTime;
            if (span.TotalMinutes < 5.0) return null;
            double spanHours = span.TotalHours;
            if (spanHours <= 0) return null;
            double firstVal = samples[0].Value;
            double lastVal = samples[samples.Count - 1].Value;
            double slope = (lastVal - firstVal) / spanHours;
            if (slope <= 0.5) return null;
            double hoursNeeded = (100.0 - lastVal) / slope;
            DateTime reaches = now.AddHours(hoursNeeded);
            if (reaches < reset) return reaches;
            return null;
        }

        static void AnimiereBalken(Border fill, double targetWidth) {
            if (targetWidth <= 0) return;
            fill.HorizontalAlignment = System.Windows.HorizontalAlignment.Left;
            DoubleAnimation anim = new DoubleAnimation(0, targetWidth, TimeSpan.FromMilliseconds(350));
            anim.EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut };
            anim.Completed += delegate {
                fill.BeginAnimation(FrameworkElement.WidthProperty, null);
                fill.HorizontalAlignment = System.Windows.HorizontalAlignment.Stretch;
                fill.Width = double.NaN;
            };
            fill.BeginAnimation(FrameworkElement.WidthProperty, anim);
        }

        static void CopyKey() {
            string keyFile = Path.Combine(store, "key");
            if (File.Exists(keyFile)) {
                string keyText = "";
                try { keyText = File.ReadAllText(keyFile).Trim(); } catch {}
                if (!string.IsNullOrEmpty(keyText)) {
                    try {
                        Clipboard.SetText(keyText);
                    } catch {}
                    trayIcon.ShowBalloonTip(3000, "Claude Stand", "Schlüssel kopiert. Auf dem Handy unter Chat-Namen anzeigen einfügen.", ToolTipIcon.Info);
                } else {
                    trayIcon.ShowBalloonTip(3000, "Claude Stand", "Noch kein Schlüssel. Er entsteht mit der nächsten Antwort in Claude Code.", ToolTipIcon.Info);
                }
            } else {
                trayIcon.ShowBalloonTip(3000, "Claude Stand", "Noch kein Schlüssel. Er entsteht mit der nächsten Antwort in Claude Code.", ToolTipIcon.Info);
            }
        }

        static void UpdateView() {
            if (currentStand == null) return;
            StandResult r = currentStand;
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            DateTime nowDt = DateTime.Now;

            // 1. Tank 5 Stunden
            if (r.Five != null && r.Five.Pct.HasValue) {
                int used = Math.Min(100, Math.Max(0, r.Five.Pct.Value));
                int left = 100 - used;
                uiFuenfZahl.Text = left.ToString();
                uiFuenfUebrig.Text = " % übrig";
                uiFuenfFillCol.Width = new GridLength(left, GridUnitType.Star);
                uiFuenfRestCol.Width = new GridLength(100 - left, GridUnitType.Star);

                string farbe = (left <= 10) ? "Rot" : (left <= 25) ? "Gelb" : "Tank";
                uiFuenfFill.SetResourceReference(Border.BackgroundProperty, farbe);

                if (!r.Five.Reset.HasValue || r.Five.Reset.Value <= now) {
                    uiFuenfReicht.Text = "";
                    uiFuenfVoll.Text = "Voll";
                    uiFuenfVoll.SetResourceReference(TextElement.ForegroundProperty, "Leise");
                    uiFuenfVoll.FontWeight = FontWeights.Normal;
                } else {
                    DateTime resetDt = DateTimeOffset.FromUnixTimeSeconds(r.Five.Reset.Value).LocalDateTime;
                    string wiederVoll = " · wieder voll " + resetDt.ToString("HH:mm");

                    if (left <= 0) {
                        uiFuenfReicht.Text = "Leer";
                        uiFuenfReicht.SetResourceReference(TextElement.ForegroundProperty, "Gelb");
                        uiFuenfReicht.FontWeight = FontWeights.SemiBold;
                        uiFuenfVoll.Text = wiederVoll;
                        uiFuenfVoll.SetResourceReference(TextElement.ForegroundProperty, "Leise");
                        uiFuenfVoll.FontWeight = FontWeights.Normal;
                    } else {
                        DateTime? reichtBis = Reicht(fiveSamples, nowDt, resetDt);
                        if (reichtBis.HasValue) {
                            uiFuenfReicht.Text = "Reicht bis " + reichtBis.Value.ToString("HH:mm");
                            uiFuenfReicht.SetResourceReference(TextElement.ForegroundProperty, "Gelb");
                            uiFuenfReicht.FontWeight = FontWeights.SemiBold;
                            uiFuenfVoll.Text = wiederVoll;
                            uiFuenfVoll.SetResourceReference(TextElement.ForegroundProperty, "Leise");
                            uiFuenfVoll.FontWeight = FontWeights.Normal;
                        } else {
                            TimeSpan t = TimeSpan.FromSeconds(r.Five.Reset.Value - now);
                            string inZeit = (t.Hours > 0)
                                ? string.Format("in {0} h {1} min", t.Hours, t.Minutes)
                                : string.Format("in {0} min", Math.Max(1, t.Minutes));
                            uiFuenfReicht.Text = "";
                            uiFuenfVoll.Text = string.Format("Wieder voll {0} · {1}", resetDt.ToString("HH:mm"), inZeit);
                            uiFuenfVoll.SetResourceReference(TextElement.ForegroundProperty, "Leise");
                            uiFuenfVoll.FontWeight = FontWeights.Normal;
                        }
                    }
                }
            } else {
                uiFuenfZahl.Text = "–";
                uiFuenfUebrig.Text = "";
                uiFuenfFillCol.Width = new GridLength(0, GridUnitType.Star);
                uiFuenfRestCol.Width = new GridLength(100, GridUnitType.Star);
                uiFuenfFill.SetResourceReference(Border.BackgroundProperty, "Tank");
                uiFuenfReicht.Text = "";
                uiFuenfVoll.Text = "–";
                uiFuenfVoll.SetResourceReference(TextElement.ForegroundProperty, "Leise");
                uiFuenfVoll.FontWeight = FontWeights.Normal;
            }

            // 2. Tank Woche
            if (r.Week != null && r.Week.Pct.HasValue) {
                int used = Math.Min(100, Math.Max(0, r.Week.Pct.Value));
                int left = 100 - used;
                uiWocheZahl.Text = left.ToString();
                uiWocheUebrig.Text = " % übrig";
                uiWocheFillCol.Width = new GridLength(left, GridUnitType.Star);
                uiWocheRestCol.Width = new GridLength(100 - left, GridUnitType.Star);

                string farbe = (left <= 10) ? "Rot" : (left <= 25) ? "Gelb" : "Tank";
                uiWocheFill.SetResourceReference(Border.BackgroundProperty, farbe);

                if (!r.Week.Reset.HasValue || r.Week.Reset.Value <= now) {
                    uiWocheBereich.Text = "Voll";
                } else {
                    DateTime resetDt = DateTimeOffset.FromUnixTimeSeconds(r.Week.Reset.Value).LocalDateTime;
                    uiWocheBereich.Text = "Wieder voll " + resetDt.ToString("ddd HH:mm", de);
                }
            } else {
                uiWocheZahl.Text = "–";
                uiWocheUebrig.Text = "";
                uiWocheFillCol.Width = new GridLength(0, GridUnitType.Star);
                uiWocheRestCol.Width = new GridLength(100, GridUnitType.Star);
                uiWocheFill.SetResourceReference(Border.BackgroundProperty, "Tank");
                uiWocheBereich.Text = "–";
            }

            // 3. AktivZeile
            bool active = r.Last != null && (now - r.Last.Updated) < 120;
            if (active) {
                uiAktivZeile.Visibility = Visibility.Visible;
                string chatName = (!string.IsNullOrEmpty(r.Last.Name)) ? r.Last.Name.Trim() : null;
                double? rate = GetRate(samples);
                string rateStr = (rate.HasValue) ? string.Format(de, "{0:0.00} $/h", rate.Value) : null;

                if (chatName != null && rateStr != null) {
                    uiAktivZeile.Text = string.Format("Läuft: {0} · {1}", chatName, rateStr);
                } else if (chatName != null) {
                    uiAktivZeile.Text = string.Format("Läuft: {0}", chatName);
                } else if (rateStr != null) {
                    uiAktivZeile.Text = string.Format("Läuft: {0}", rateStr);
                } else {
                    uiAktivZeile.Text = "Läuft gerade";
                }
            } else {
                uiAktivZeile.Visibility = Visibility.Collapsed;
                uiAktivZeile.Text = "";
            }

            // 5. Totals
            uiHeuteGeld.Text = FormatGeld(r.TodayCost);
            uiWocheGeld.Text = FormatGeld(r.WeekCost);
            uiHeuteTokens.Text = FormatTokens(r.TodayTokens) + " Tokens";
            uiWocheTokens.Text = FormatTokens(r.WeekTokens) + " Tokens";
        }

        static void SetTrayIcon(string text, int? leftFive) {
            int px = SystemInformation.SmallIconSize.Width;
            DrawingVisual dv = new DrawingVisual();
            using (DrawingContext dc = dv.RenderOpen()) {
                BrushConverter conv = new BrushConverter();
                string bgHex;
                string fgHex;

                if (leftFive.HasValue && leftFive.Value <= 10) {
                    bgHex = "#e5484d";
                    fgHex = "#ffffff";
                } else if (leftFive.HasValue && leftFive.Value <= 25) {
                    bgHex = "#f0a020";
                    fgHex = "#16191d";
                } else {
                    bgHex = "#ece8df";
                    fgHex = "#16191d";
                }

                Brush bg = (Brush)conv.ConvertFromString(bgHex);
                Brush fg = (Brush)conv.ConvertFromString(fgHex);
                dc.DrawRoundedRectangle(bg, null, new Rect(0, 0, px, px), px * 0.2, px * 0.2);

                Typeface face = new Typeface(new FontFamily("Segoe UI Variable Display, Segoe UI"), FontStyles.Normal, FontWeights.SemiBold, FontStretches.Normal);
                double size = px * (text.Length >= 3 ? 0.65 : (text.Length == 2 ? 0.85 : 0.95));
                FormattedText ft = new FormattedText(text, de, FlowDirection.LeftToRight, face, size, fg, 1.0);
                dc.DrawText(ft, new Point((px - ft.Width) / 2.0, (px + face.CapsHeight * size) / 2.0 - ft.Baseline));
            }

            RenderTargetBitmap bmp = new RenderTargetBitmap(px, px, 96, 96, PixelFormats.Pbgra32);
            bmp.Render(dv);

            PngBitmapEncoder png = new PngBitmapEncoder();
            png.Frames.Add(BitmapFrame.Create(bmp));
            using (MemoryStream ms = new MemoryStream()) {
                png.Save(ms);
                ms.Position = 0;
                using (System.Drawing.Bitmap bm = new System.Drawing.Bitmap(ms)) {
                    IntPtr handle = bm.GetHicon();
                    trayIcon.Icon = System.Drawing.Icon.FromHandle(handle);
                    if (oldIconHandle != IntPtr.Zero) {
                        DestroyIcon(oldIconHandle);
                    }
                    oldIconHandle = handle;
                }
            }
        }

        static void UpdateStand() {
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            List<Session> sessions = ReadSessions(store, cache);
            StandResult r = GetStand(sessions, now);
            currentStand = r;

            samples.Add(new Sample(now, r.Costs));
            while (samples.Count > 2 && (now - samples[0].T) > 300) {
                samples.RemoveAt(0);
            }

            long? currentReset = (r.Five != null) ? r.Five.Reset : null;
            if (currentReset != lastFiveReset) {
                fiveSamples.Clear();
                lastFiveReset = currentReset;
            }
            if (r.Five != null && r.Five.Pct.HasValue) {
                DateTime nowDt = DateTime.Now;
                fiveSamples.Add(new KeyValuePair<DateTime, double>(nowDt, r.Five.Pct.Value));
                DateTime cutoff = nowDt.AddMinutes(-60);
                while (fiveSamples.Count > 0 && fiveSamples[0].Key < cutoff) {
                    fiveSamples.RemoveAt(0);
                }
            }

            int? leftFive = null;
            if (r.Five != null && r.Five.Pct.HasValue) {
                leftFive = Math.Min(100, Math.Max(0, 100 - r.Five.Pct.Value));
            }
            int? leftWeek = null;
            if (r.Week != null && r.Week.Pct.HasValue) {
                leftWeek = Math.Min(100, Math.Max(0, 100 - r.Week.Pct.Value));
            }

            string text = (!leftFive.HasValue) ? "–" : leftFive.Value.ToString();
            string iconState = text + ":" + (leftFive.HasValue ? leftFive.Value.ToString() : "-");
            if (iconState != iconText) {
                SetTrayIcon(text, leftFive);
                iconText = iconState;
            }

            if (!leftFive.HasValue) {
                trayIcon.Text = "Claude Stand: noch keine Messung";
            } else {
                trayIcon.Text = string.Format("Claude: 5 Stunden {0} % übrig, Woche {1} % übrig",
                    leftFive.Value,
                    leftWeek.HasValue ? leftWeek.Value : 0);
            }

            if (win.IsVisible) {
                UpdateView();
            }
        }

        static void ShowStand() {
            SetTheme();
            UpdateView();

            uiFuenfFill.BeginAnimation(FrameworkElement.WidthProperty, null);
            uiFuenfFill.HorizontalAlignment = System.Windows.HorizontalAlignment.Stretch;
            uiFuenfFill.Width = double.NaN;
            uiWocheFill.BeginAnimation(FrameworkElement.WidthProperty, null);
            uiWocheFill.HorizontalAlignment = System.Windows.HorizontalAlignment.Stretch;
            uiWocheFill.Width = double.NaN;

            win.BeginAnimation(UIElement.OpacityProperty, null);
            win.Opacity = 0;
            win.Show();
            win.UpdateLayout();

            Rect wa = SystemParameters.WorkArea;
            win.Left = wa.Right - win.ActualWidth + 4;
            win.Top = wa.Bottom - win.ActualHeight + 4;
            win.Activate();

            if (SystemParameters.ClientAreaAnimation) {
                DoubleAnimation fade = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(140));
                win.BeginAnimation(UIElement.OpacityProperty, fade);

                DoubleAnimation slide = new DoubleAnimation(14, 0, TimeSpan.FromMilliseconds(240));
                slide.EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut };
                uiSchub.BeginAnimation(TranslateTransform.YProperty, slide);

                AnimiereBalken(uiFuenfFill, uiFuenfFillCol.ActualWidth);
                AnimiereBalken(uiWocheFill, uiWocheFillCol.ActualWidth);
            } else {
                win.Opacity = 1;
            }
        }

        static void HideStand() {
            win.Hide();
        }

        static int RunTests(string resultFile, string dataFolder) {
            List<string> lines = new List<string>();
            int failCount = 0;

            Action<bool, string> check = delegate(bool ok, string what) {
                if (!ok) {
                    lines.Add("FEHLER: " + what);
                    failCount++;
                }
            };

            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            Func<long, string> key = delegate(long ago) {
                return DateTimeOffset.FromUnixTimeSeconds(now - ago).LocalDateTime.ToString("yyyy-MM-ddTHH");
            };

            Dictionary<string, double[]> h = new Dictionary<string, double[]>();
            h[key(0)] = new double[] { 1000, 100, 1.5 };
            h[key(2 * 86400)] = new double[] { 500, 50, 0.5 };
            h[key(8 * 86400)] = new double[] { 9, 9, 9 };

            Session a = new Session();
            a.Id = "a";
            a.Updated = now - 30;
            a.Cost = 3;
            a.Five = 40;
            a.FiveReset = now + 3600;
            a.Week = 20;
            a.WeekReset = now + 86400;
            a.Hours = h;

            Dictionary<string, double[]> hb = new Dictionary<string, double[]>();
            hb[key(0)] = new double[] { 10, 0, 0.25 };
            Session b = new Session();
            b.Id = "b";
            b.Updated = now - 600;
            b.Cost = 1;
            b.Five = 35;
            b.FiveReset = now + 3600;
            b.Week = 22;
            b.WeekReset = now + 86430;
            b.Hours = hb;

            Session c = new Session();
            c.Id = "c";
            c.Updated = now - 90000;
            c.Cost = 9;
            c.Five = 99;
            c.FiveReset = now - 7200;
            c.Week = 99;
            c.WeekReset = now - 6 * 86400;
            c.Hours = new Dictionary<string, double[]>();

            StandResult r = GetStand(new Session[] { a, b, c }, now);
            check(r.Five != null && r.Five.Pct == 40 && r.Five.Reset == now + 3600,
                "5h: hoechster Wert im neuesten Fenster (" + (r.Five != null ? r.Five.Pct.ToString() : "null") + ")");
            check(r.Week != null && r.Week.Pct == 22,
                "Woche: Fenster mit 30 s Abweichung zaehlt mit (" + (r.Week != null ? r.Week.Pct.ToString() : "null") + ")");
            check(Math.Abs(r.TodayCost - 1.75) < 1e-9 && r.TodayTokens == 1110,
                "heute (" + r.TodayCost + ", " + r.TodayTokens + ")");
            check(Math.Abs(r.WeekCost - 2.25) < 1e-9 && r.WeekTokens == 1660,
                "Woche ohne 8 Tage alte Stunde (" + r.WeekCost + ", " + r.WeekTokens + ")");
            check(r.Last == a && r.Costs.ContainsKey("b") && r.Costs["b"] == 1.0,
                "letzte Sitzung und Kosten je Sitzung");

            List<Sample> sampleList = new List<Sample>();
            Dictionary<string, double> s0 = new Dictionary<string, double>(); s0["a"] = 1.0;
            Dictionary<string, double> s1 = new Dictionary<string, double>(); s1["a"] = 1.5; s1["b"] = 40.0;
            Dictionary<string, double> s2 = new Dictionary<string, double>(); s2["a"] = 2.0; s2["b"] = 40.5;
            sampleList.Add(new Sample(0, s0));
            sampleList.Add(new Sample(60, s1));
            sampleList.Add(new Sample(120, s2));

            double? rate = GetRate(sampleList);
            check(rate.HasValue && rate.Value == 45.0,
                "Tempo: neue Sitzung zaehlt ab ihrem ersten Auftauchen (" + (rate.HasValue ? rate.Value.ToString() : "null") + ")");
            check(GetRate(new Sample[] { sampleList[0], sampleList[0] }) == null,
                "Tempo erst nach einer Minute");
            check(GetLimit(new Session[] { c }, "five", "fiveReset", now).Pct == 0,
                "abgelaufenes Fenster zeigt 0");
            check(GetLimit(new Session[0], "five", "fiveReset", now).Pct == null,
                "ohne Messung kein Wert");
            check(FormatTokens(14234567) == "14,2 Mio." && FormatGeld(1234.5) == "1.234,50 $",
                "Zahlenformat");

            DateTime testNow = new DateTime(2026, 1, 1, 12, 0, 0);
            List<KeyValuePair<DateTime, double>> rSamples = new List<KeyValuePair<DateTime, double>>();
            rSamples.Add(new KeyValuePair<DateTime, double>(testNow.AddMinutes(-60), 10.0));
            rSamples.Add(new KeyValuePair<DateTime, double>(testNow, 30.0));

            DateTime? reicht4h = Reicht(rSamples, testNow, testNow.AddHours(4));
            check(reicht4h.HasValue && Math.Abs((reicht4h.Value - testNow.AddHours(3.5)).TotalSeconds) < 1.0,
                "Reicht: 10->30% ueber 60 min, Reset in 4 h -> ca. now + 3.5 h");

            DateTime? reicht2h = Reicht(rSamples, testNow, testNow.AddHours(2));
            check(!reicht2h.HasValue,
                "Reicht: Reset in 2 h -> null");

            List<KeyValuePair<DateTime, double>> shortSamples = new List<KeyValuePair<DateTime, double>>();
            shortSamples.Add(new KeyValuePair<DateTime, double>(testNow.AddMinutes(-4), 10.0));
            shortSamples.Add(new KeyValuePair<DateTime, double>(testNow, 30.0));
            DateTime? reichtShort = Reicht(shortSamples, testNow, testNow.AddHours(4));
            check(!reichtShort.HasValue,
                "Reicht: unter 5 min -> null");

            List<KeyValuePair<DateTime, double>> flatSamples = new List<KeyValuePair<DateTime, double>>();
            flatSamples.Add(new KeyValuePair<DateTime, double>(testNow.AddMinutes(-60), 20.0));
            flatSamples.Add(new KeyValuePair<DateTime, double>(testNow, 20.0));
            DateTime? reichtFlat = Reicht(flatSamples, testNow, testNow.AddHours(4));
            check(!reichtFlat.HasValue,
                "Reicht: flach -> null");

            if (failCount == 0) {
                lines.Add("Alles in Ordnung");
            }

            if (!string.IsNullOrEmpty(dataFolder)) {
                Dictionary<string, CacheEntry> dirCache = new Dictionary<string, CacheEntry>();
                List<Session> dirSessions = ReadSessions(dataFolder, dirCache);
                StandResult dirStand = GetStand(dirSessions, now);
                string summeLine = string.Format(CultureInfo.InvariantCulture,
                    "summe heute={0:0.00};tokens={1};woche={2:0.00};wochentokens={3};fuenf={4};wochenpct={5}",
                    dirStand.TodayCost,
                    dirStand.TodayTokens,
                    dirStand.WeekCost,
                    dirStand.WeekTokens,
                    dirStand.Five != null && dirStand.Five.Pct.HasValue ? dirStand.Five.Pct.Value.ToString() : "0",
                    dirStand.Week != null && dirStand.Week.Pct.HasValue ? dirStand.Week.Pct.Value.ToString() : "0");
                lines.Add(summeLine);
            }

            try {
                File.WriteAllLines(resultFile, lines.ToArray(), new UTF8Encoding(false));
            } catch (Exception ex) {
                Console.Error.WriteLine(ex.Message);
                return 1;
            }

            return failCount == 0 ? 0 : 1;
        }

        [STAThread]
        static void Main(string[] args) {
            if (args.Length >= 2 && args[0] == "--test") {
                int code = RunTests(args[1], args.Length >= 3 ? args[2] : null);
                Environment.Exit(code);
                return;
            }

            bool leise = false;
            for (int i = 0; i < args.Length; i++) {
                if (args[i] == "--leise") leise = true;
            }

            openEvent = new EventWaitHandle(false, EventResetMode.AutoReset, "claude-stand-tray-open");
            appMutex = new Mutex(false, "claude-stand-tray");
            bool first = false;
            try {
                first = appMutex.WaitOne(0);
            } catch (AbandonedMutexException) {
                first = true;
            }

            if (!first) {
                try {
                    openEvent.Set();
                } catch {}
                return;
            }

            SetProcessDPIAware();

            store = GetDataFolder();
            if (Directory.Exists(store)) {
                try {
                    DateTime cut = DateTime.Now.AddDays(-35);
                    foreach (string file in Directory.GetFiles(store, "*.json")) {
                        try {
                            if (File.GetLastWriteTime(file) < cut) {
                                File.Delete(file);
                            }
                        } catch {}
                    }
                } catch {}
            }

            Application app = new Application();
            app.ShutdownMode = ShutdownMode.OnExplicitShutdown;

            win = (Window)XamlReader.Parse(WindowXaml);
            uiSchub = (TranslateTransform)win.FindName("Schub");
            uiFuenfZahl = (Run)win.FindName("FuenfZahl");
            uiFuenfUebrig = (Run)win.FindName("FuenfUebrig");
            uiFuenfFillCol = (ColumnDefinition)win.FindName("FuenfFillCol");
            uiFuenfRestCol = (ColumnDefinition)win.FindName("FuenfRestCol");
            uiFuenfFill = (Border)win.FindName("FuenfFill");
            uiFuenfReicht = (Run)win.FindName("FuenfReicht");
            uiFuenfVoll = (Run)win.FindName("FuenfVoll");

            uiWocheZahl = (Run)win.FindName("WocheZahl");
            uiWocheUebrig = (Run)win.FindName("WocheUebrig");
            uiWocheFillCol = (ColumnDefinition)win.FindName("WocheFillCol");
            uiWocheRestCol = (ColumnDefinition)win.FindName("WocheRestCol");
            uiWocheFill = (Border)win.FindName("WocheFill");
            uiWocheBereich = (TextBlock)win.FindName("WocheBereich");

            uiAktivZeile = (TextBlock)win.FindName("AktivZeile");
            uiHeuteGeld = (TextBlock)win.FindName("HeuteGeld");
            uiHeuteTokens = (TextBlock)win.FindName("HeuteTokens");
            uiWocheGeld = (TextBlock)win.FindName("WocheGeld");
            uiWocheTokens = (TextBlock)win.FindName("WocheTokens");
            uiSchluessel = (System.Windows.Controls.Button)win.FindName("Schluessel");
            uiOeffnen = (System.Windows.Controls.Button)win.FindName("Oeffnen");

            SetTheme();

            zuTimer = new DispatcherTimer();
            zuTimer.Interval = TimeSpan.FromMilliseconds(60);
            zuTimer.Tick += delegate {
                zuTimer.Stop();
                if (!win.IsVisible || win.IsActive) return;
                if ((DateTime.UtcNow - toggled).TotalMilliseconds < 1000) {
                    win.Activate();
                    return;
                }
                StringBuilder name = new StringBuilder(64);
                GetClassName(GetForegroundWindow(), name, 64);
                string className = name.ToString();
                if ((className == "Shell_TrayWnd" || className == "Shell_SecondaryTrayWnd") && (DateTime.UtcNow - left).TotalMilliseconds < 700) {
                    zuTimer.Start();
                } else {
                    HideStand();
                }
            };

            win.Deactivated += delegate {
                left = DateTime.UtcNow;
                zuTimer.Start();
            };

            win.KeyDown += delegate(object sender, KeyEventArgs e) {
                if (e.Key == Key.Escape) {
                    HideStand();
                }
            };

            win.Closing += delegate(object sender, CancelEventArgs e) {
                e.Cancel = true;
                HideStand();
            };

            uiSchluessel.Click += delegate {
                CopyKey();
            };

            uiOeffnen.Click += delegate {
                Process.Start(standUrl);
                HideStand();
            };

            trayIcon = new NotifyIcon();
            trayIcon.MouseClick += delegate(object sender, MouseEventArgs e) {
                if (e.Button != MouseButtons.Left) return;
                if ((DateTime.UtcNow - toggled).TotalMilliseconds < SystemInformation.DoubleClickTime) {
                    if (win.IsVisible) win.Activate();
                    return;
                }
                toggled = DateTime.UtcNow;
                if (win.IsVisible) {
                    HideStand();
                } else {
                    ShowStand();
                }
            };

            trayIcon.MouseDoubleClick += delegate(object sender, MouseEventArgs e) {
                if (e.Button == MouseButtons.Left) {
                    toggled = DateTime.UtcNow;
                    if (win.IsVisible) win.Activate();
                    else ShowStand();
                }
            };

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Items.Add("Stand im Browser öffnen", null, delegate {
                Process.Start(standUrl);
            });

            menu.Items.Add("Schlüssel fürs Handy kopieren", null, delegate {
                CopyKey();
            });

            ToolStripMenuItem autoItem = new ToolStripMenuItem("Mit Windows starten");
            string exePath = Assembly.GetExecutingAssembly().Location;
            autoItem.Click += delegate {
                try {
                    using (RegistryKey runKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true)) {
                        if (runKey != null) {
                            if (runKey.GetValue("Claude Stand") != null) {
                                runKey.DeleteValue("Claude Stand", false);
                                autoItem.Checked = false;
                            } else {
                                runKey.SetValue("Claude Stand", "\"" + exePath + "\" --leise");
                                autoItem.Checked = true;
                            }
                        }
                    }
                } catch {}
            };
            menu.Opening += delegate {
                try {
                    using (RegistryKey runKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", false)) {
                        autoItem.Checked = (runKey != null && runKey.GetValue("Claude Stand") != null);
                    }
                } catch {}
            };
            try {
                using (RegistryKey runKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", false)) {
                    autoItem.Checked = (runKey != null && runKey.GetValue("Claude Stand") != null);
                }
            } catch {}

            menu.Items.Add(autoItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Beenden", null, delegate {
                trayIcon.Visible = false;
                trayIcon.Dispose();
                if (oldIconHandle != IntPtr.Zero) {
                    DestroyIcon(oldIconHandle);
                    oldIconHandle = IntPtr.Zero;
                }
                app.Shutdown();
            });

            trayIcon.ContextMenuStrip = menu;

            UpdateStand();
            trayIcon.Visible = true;

            DispatcherTimer timer = new DispatcherTimer();
            timer.Interval = TimeSpan.FromSeconds(2);
            timer.Tick += delegate {
                UpdateStand();
            };
            timer.Start();

            DispatcherTimer tuer = new DispatcherTimer();
            tuer.Interval = TimeSpan.FromMilliseconds(250);
            tuer.Tick += delegate {
                if (openEvent.WaitOne(0)) {
                    ShowStand();
                }
            };
            tuer.Start();

            if (!leise) {
                win.Dispatcher.BeginInvoke(new Action(ShowStand));
            }

            app.Run();
        }
    }
}
