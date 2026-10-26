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

    class Walze {
        public StackPanel Panel;
        public int Digit;
    }

    class Zaehler {
        public Walze[] Walzen;
        public TextBlock Reset;
        public long Window;
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
        static StackPanel uiFuenf;
        static StackPanel uiWoche;
        static Grid uiSchlitz;
        static TranslateTransform uiRiffel;
        static TranslateTransform uiMarke;
        static TextBlock uiTempo;
        static TextBlock uiChatName;
        static TextBlock uiHeuteGeld;
        static TextBlock uiHeuteTokens;
        static TextBlock uiWocheGeld;
        static TextBlock uiWocheTokens;
        static System.Windows.Controls.Button uiOeffnen;

        static Zaehler zaehlerFive;
        static Zaehler zaehlerWeek;
        static AnimationClock[] discClocks;
        static double currentSpeed = 0.0;

        static Dictionary<string, CacheEntry> cache = new Dictionary<string, CacheEntry>();
        static List<Sample> samples = new List<Sample>();
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
            { "Gehaeuse", "#2a2f32" },
            { "Deckel", "#33393c" },
            { "Schild", "#e4e5e1" },
            { "Beschriftung", "#a3a8a6" },
            { "Linie", "#4a5054" },
            { "Zaehlwerk", "#151718" },
            { "Ziffer", "#f2f2ee" },
            { "Rot", "#e0343f" }
        };

        static readonly Dictionary<string, string> FarbenHell = new Dictionary<string, string> {
            { "Gehaeuse", "#dcdedb" },
            { "Deckel", "#e9eae7" },
            { "Schild", "#1f2326" },
            { "Beschriftung", "#4e5458" },
            { "Linie", "#b9bcb8" },
            { "Zaehlwerk", "#151718" },
            { "Ziffer", "#f2f2ee" },
            { "Rot", "#c40d1e" }
        };

        const string WindowXaml = @"<Window xmlns=""http://schemas.microsoft.com/winfx/2006/xaml/presentation""
        xmlns:x=""http://schemas.microsoft.com/winfx/2006/xaml""
        Title=""Claude Stand"" Width=""380"" SizeToContent=""Height"" WindowStyle=""None"" AllowsTransparency=""True""
        Background=""Transparent"" ResizeMode=""NoResize"" ShowInTaskbar=""False"" Topmost=""True"" Left=""-3000"" Top=""0""
        FontFamily=""Bahnschrift"" FontSize=""13"" Foreground=""{DynamicResource Schild}"" UseLayoutRounding=""True"">
  <Window.Resources>
    <LinearGradientBrush x:Key=""Scheibe"" StartPoint=""0,0"" EndPoint=""1,0"">
      <GradientStop Color=""#3b4043"" Offset=""0""/>
      <GradientStop Color=""#a7aba8"" Offset=""0.3""/>
      <GradientStop Color=""#dcdeda"" Offset=""0.5""/>
      <GradientStop Color=""#a7aba8"" Offset=""0.7""/>
      <GradientStop Color=""#3b4043"" Offset=""1""/>
    </LinearGradientBrush>
    <LinearGradientBrush x:Key=""Rand"" StartPoint=""0,0"" EndPoint=""1,0"">
      <GradientStop Color=""#FF151718"" Offset=""0""/>
      <GradientStop Color=""#00151718"" Offset=""0.2""/>
      <GradientStop Color=""#00151718"" Offset=""0.8""/>
      <GradientStop Color=""#FF151718"" Offset=""1""/>
    </LinearGradientBrush>
    <Style x:Key=""Leise"" TargetType=""Button"">
      <Setter Property=""Foreground"" Value=""{DynamicResource Schild}""/>
      <Setter Property=""BorderBrush"" Value=""{DynamicResource Linie}""/>
      <Setter Property=""Cursor"" Value=""Hand""/>
      <Setter Property=""FocusVisualStyle"" Value=""{x:Null}""/>
      <Setter Property=""Template"">
        <Setter.Value>
          <ControlTemplate TargetType=""Button"">
            <Border x:Name=""B"" Background=""Transparent"" BorderBrush=""{TemplateBinding BorderBrush}"" BorderThickness=""1"" CornerRadius=""6"" Padding=""10,5"">
              <ContentPresenter HorizontalAlignment=""Center"" VerticalAlignment=""Center""/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property=""IsMouseOver"" Value=""True""><Setter TargetName=""B"" Property=""BorderBrush"" Value=""{DynamicResource Beschriftung}""/></Trigger>
              <Trigger Property=""IsKeyboardFocused"" Value=""True""><Setter TargetName=""B"" Property=""BorderBrush"" Value=""{DynamicResource Schild}""/></Trigger>
              <Trigger Property=""IsPressed"" Value=""True""><Setter TargetName=""B"" Property=""Background"" Value=""{DynamicResource Linie}""/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>
  <Grid Margin=""16"">
    <Grid.RenderTransform><TranslateTransform x:Name=""Schub""/></Grid.RenderTransform>
    <Border Background=""{DynamicResource Gehaeuse}"" CornerRadius=""10"">
      <Border.Effect><DropShadowEffect BlurRadius=""24"" ShadowDepth=""5"" Direction=""270"" Opacity=""0.45"" Color=""Black""/></Border.Effect>
    </Border>
    <Border BorderBrush=""{DynamicResource Linie}"" BorderThickness=""1"" CornerRadius=""10"" Padding=""12"">
      <StackPanel>
        <Border Background=""{DynamicResource Deckel}"" BorderBrush=""{DynamicResource Linie}"" BorderThickness=""1"" CornerRadius=""7"" Padding=""14,12,14,14"">
          <StackPanel>
            <Grid>
              <Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width=""18""/><ColumnDefinition/></Grid.ColumnDefinitions>
              <StackPanel x:Name=""Fuenf"" Grid.Column=""0""/>
              <StackPanel x:Name=""Woche"" Grid.Column=""2""/>
            </Grid>
            <Grid x:Name=""Schlitz"" Margin=""0,18,0,0"" Height=""18"" ClipToBounds=""True"">
              <Border Background=""{DynamicResource Zaehlwerk}"" CornerRadius=""3""/>
              <Rectangle Height=""6"" Margin=""4,0"" Fill=""{StaticResource Scheibe}""/>
              <Rectangle Height=""6"" Margin=""4,0"">
                <Rectangle.Fill>
                  <DrawingBrush TileMode=""Tile"" Viewport=""0,0,12,6"" ViewportUnits=""Absolute"" Stretch=""None"">
                    <DrawingBrush.Transform><TranslateTransform x:Name=""Riffel""/></DrawingBrush.Transform>
                    <DrawingBrush.Drawing>
                      <DrawingGroup>
                        <GeometryDrawing Brush=""Transparent""><GeometryDrawing.Geometry><RectangleGeometry Rect=""0,0,12,6""/></GeometryDrawing.Geometry></GeometryDrawing>
                        <GeometryDrawing Brush=""#70151718""><GeometryDrawing.Geometry><RectangleGeometry Rect=""0,0,1,6""/></GeometryDrawing.Geometry></GeometryDrawing>
                      </DrawingGroup>
                    </DrawingBrush.Drawing>
                  </DrawingBrush>
                </Rectangle.Fill>
              </Rectangle>
              <Canvas Margin=""4,0"">
                <Rectangle Width=""10"" Height=""6"" Canvas.Top=""6"" Fill=""{DynamicResource Rot}"">
                  <Rectangle.RenderTransform><TranslateTransform x:Name=""Marke"" X=""-16""/></Rectangle.RenderTransform>
                </Rectangle>
              </Canvas>
              <Rectangle Height=""6"" Margin=""4,0"" Fill=""{StaticResource Rand}""/>
            </Grid>
            <TextBlock x:Name=""Tempo"" Margin=""0,8,0,0"" FontSize=""12"" Foreground=""{DynamicResource Beschriftung}""/>
            <TextBlock x:Name=""ChatName"" Margin=""0,3,0,0"" FontSize=""12"" Foreground=""{DynamicResource Beschriftung}"" TextTrimming=""CharacterEllipsis"" Visibility=""Collapsed""/>
          </StackPanel>
        </Border>
        <Grid Margin=""4,14,4,0"">
          <Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width=""Auto""/><ColumnDefinition Width=""Auto"" MinWidth=""128""/></Grid.ColumnDefinitions>
          <Grid.RowDefinitions><RowDefinition/><RowDefinition Height=""6""/><RowDefinition/></Grid.RowDefinitions>
          <TextBlock Text=""Heute"" FontSize=""14""/>
          <TextBlock x:Name=""HeuteGeld"" Grid.Column=""1"" FontSize=""14"" FontWeight=""SemiBold"" TextAlignment=""Right""/>
          <TextBlock x:Name=""HeuteTokens"" Grid.Column=""2"" FontSize=""14"" TextAlignment=""Right"" Foreground=""{DynamicResource Beschriftung}""/>
          <TextBlock Grid.Row=""2"" Text=""Diese Woche"" FontSize=""14""/>
          <TextBlock x:Name=""WocheGeld"" Grid.Row=""2"" Grid.Column=""1"" FontSize=""14"" FontWeight=""SemiBold"" TextAlignment=""Right""/>
          <TextBlock x:Name=""WocheTokens"" Grid.Row=""2"" Grid.Column=""2"" FontSize=""14"" TextAlignment=""Right"" Foreground=""{DynamicResource Beschriftung}""/>
        </Grid>
        <DockPanel Margin=""4,12,4,0"" LastChildFill=""False"">
          <Button x:Name=""Oeffnen"" DockPanel.Dock=""Right"" Style=""{StaticResource Leise}"" FontSize=""12"" Content=""Stand öffnen""/>
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
            long top = long.MinValue;

            foreach (Session s in sessions) {
                long? r = (resetKey == "fiveReset") ? s.FiveReset : s.WeekReset;
                if (r.HasValue && r.Value > 0) {
                    withReset.Add(s);
                    if (r.Value > top) {
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
                if (r.HasValue && r.Value >= top - 60) {
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

        static string FormatReset(LimitResult limit, long now) {
            if (limit == null || !limit.Pct.HasValue) {
                return "Noch keine Messung";
            }
            if (!limit.Reset.HasValue || limit.Reset.Value == 0) {
                return "Wieder frei";
            }
            TimeSpan t = TimeSpan.FromSeconds(limit.Reset.Value - now);
            if (t.TotalHours >= 24) {
                DateTimeOffset dto = DateTimeOffset.FromUnixTimeSeconds(limit.Reset.Value);
                return "Reset " + dto.LocalDateTime.ToString("ddd HH:mm", de);
            }
            if (t.Hours != 0) {
                return string.Format("Reset in {0} h {1} min", t.Hours, t.Minutes);
            }
            return string.Format("Reset in {0} min", Math.Max(1, t.Minutes));
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

        static Zaehler NewZaehler(StackPanel panel, string label, long window) {
            TextBlock lbl = new TextBlock();
            lbl.Text = label;
            lbl.FontWeight = FontWeights.SemiBold;
            panel.Children.Add(lbl);

            StackPanel row = new StackPanel();
            row.Orientation = Orientation.Horizontal;
            row.Margin = new Thickness(0, 7, 0, 0);

            const double H = 40.0;
            Walze[] walzen = new Walze[3];
            for (int i = 0; i < 3; i++) {
                Border b = new Border();
                b.Width = 28;
                b.Height = H;
                b.CornerRadius = new CornerRadius(3);
                b.ClipToBounds = true;
                b.Margin = new Thickness(0, 0, 3, 0);
                b.SetResourceReference(Border.BackgroundProperty, (i == 2) ? "Rot" : "Zaehlwerk");

                StackPanel sp = new StackPanel();
                sp.Width = 28;
                sp.RenderTransform = new TranslateTransform();

                for (int z = 0; z <= 9; z++) {
                    TextBlock t = new TextBlock();
                    t.Text = z.ToString();
                    t.Height = H;
                    t.FontSize = 36;
                    t.FontWeight = FontWeights.Bold;
                    t.FontStretch = FontStretches.Condensed;
                    t.TextAlignment = TextAlignment.Center;
                    t.Padding = new Thickness(0, 1, 0, 0);
                    t.SetResourceReference(TextBlock.ForegroundProperty, "Ziffer");
                    sp.Children.Add(t);
                }

                Canvas roll = new Canvas();
                roll.Children.Add(sp);
                b.Child = roll;
                row.Children.Add(b);

                walzen[i] = new Walze { Panel = sp, Digit = 0 };
            }

            TextBlock pctBlock = new TextBlock();
            pctBlock.Text = "%";
            pctBlock.FontSize = 17;
            pctBlock.FontWeight = FontWeights.SemiBold;
            pctBlock.VerticalAlignment = VerticalAlignment.Bottom;
            pctBlock.Margin = new Thickness(2, 0, 0, 2);
            row.Children.Add(pctBlock);

            panel.Children.Add(row);

            TextBlock reset = new TextBlock();
            reset.FontSize = 12;
            reset.Margin = new Thickness(0, 7, 0, 0);
            reset.SetResourceReference(TextBlock.ForegroundProperty, "Beschriftung");
            panel.Children.Add(reset);

            return new Zaehler { Walzen = walzen, Reset = reset, Window = window };
        }

        static void SetZaehler(Zaehler z, LimitResult limit, long now, bool motion) {
            int n = (limit == null || !limit.Pct.HasValue) ? 0 : Math.Min(100, Math.Max(0, limit.Pct.Value));
            string txt = n.ToString("000");
            const double H = 40.0;
            for (int i = 0; i < 3; i++) {
                Walze w = z.Walzen[i];
                int d = txt[i] - '0';
                w.Panel.Opacity = (limit == null || !limit.Pct.HasValue || (i < 2 && n < Math.Pow(10, 2 - i))) ? 0.45 : 1.0;
                if (w.Digit == d) continue;
                w.Digit = d;
                DoubleAnimation roll = new DoubleAnimation(-d * H, TimeSpan.FromMilliseconds(motion ? 900 : 0));
                roll.EasingFunction = new QuarticEase { EasingMode = EasingMode.EaseOut };
                w.Panel.RenderTransform.BeginAnimation(TranslateTransform.YProperty, roll);
            }
            z.Reset.Text = FormatReset(limit, now);
        }

        static void StartScheibe() {
            double w = uiSchlitz.ActualWidth - 8;
            if (w <= 0) return;
            double T = 24.0;
            DoubleAnimationUsingKeyFrames mark = new DoubleAnimationUsingKeyFrames();
            mark.Duration = TimeSpan.FromSeconds(T);
            mark.RepeatBehavior = RepeatBehavior.Forever;
            mark.KeyFrames.Add(new DiscreteDoubleKeyFrame(-16, TimeSpan.Zero));
            mark.KeyFrames.Add(new EasingDoubleKeyFrame(w + 6, TimeSpan.FromSeconds(T / 2), new SineEase { EasingMode = EasingMode.EaseInOut }));

            DoubleAnimation rim = new DoubleAnimation(0, 12, TimeSpan.FromSeconds(12 * T / (Math.PI * w)));
            rim.RepeatBehavior = RepeatBehavior.Forever;

            discClocks = new AnimationClock[] { mark.CreateClock(), rim.CreateClock() };
            uiMarke.ApplyAnimationClock(TranslateTransform.XProperty, discClocks[0]);
            uiRiffel.ApplyAnimationClock(TranslateTransform.XProperty, discClocks[1]);
            foreach (AnimationClock c in discClocks) {
                c.Controller.Pause();
            }
        }

        static void SetScheibe(double speed) {
            currentSpeed = speed;
            if (uiSchlitz.ActualWidth <= 0) return;
            if (!SystemParameters.ClientAreaAnimation) {
                uiMarke.X = (uiSchlitz.ActualWidth - 8) * 0.4;
                return;
            }
            if (discClocks == null) {
                StartScheibe();
            }
            if (discClocks != null) {
                foreach (AnimationClock c in discClocks) {
                    if (speed > 0 && win.IsVisible) {
                        c.Controller.SpeedRatio = speed;
                        c.Controller.Resume();
                    } else {
                        c.Controller.Pause();
                    }
                }
            }
        }

        static void UpdateView() {
            if (currentStand == null) return;
            StandResult r = currentStand;
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            bool motion = SystemParameters.ClientAreaAnimation;

            SetZaehler(zaehlerFive, r.Five, now, motion);
            SetZaehler(zaehlerWeek, r.Week, now, motion);

            uiHeuteGeld.Text = FormatGeld(r.TodayCost);
            uiWocheGeld.Text = FormatGeld(r.WeekCost);
            uiHeuteTokens.Text = FormatTokens(r.TodayTokens) + " Tokens";
            uiWocheTokens.Text = FormatTokens(r.WeekTokens) + " Tokens";

            bool active = r.Last != null && (now - r.Last.Updated) < 120;
            if (active && !string.IsNullOrEmpty(r.Last.Name)) {
                uiChatName.Text = r.Last.Name;
                uiChatName.Visibility = Visibility.Visible;
            } else {
                uiChatName.Text = "";
                uiChatName.Visibility = Visibility.Collapsed;
            }

            double? rate = GetRate(samples);
            if (!active || (rate.HasValue && rate.Value == 0)) {
                SetScheibe(0);
                uiTempo.Text = "Gerade kein Verbrauch";
            } else if (!rate.HasValue) {
                SetScheibe(1.0);
                uiTempo.Text = "Läuft gerade";
            } else {
                double speed = Math.Min(10.0, Math.Max(0.3, Math.Sqrt(rate.Value)));
                SetScheibe(speed);
                uiTempo.Text = string.Format("Gerade {0} pro Stunde", FormatGeld(rate.Value));
            }
        }

        static void SetTrayIcon(string text, bool alarm) {
            int px = SystemInformation.SmallIconSize.Width;
            DrawingVisual dv = new DrawingVisual();
            using (DrawingContext dc = dv.RenderOpen()) {
                BrushConverter conv = new BrushConverter();
                Dictionary<string, string> theme = currentFarben ?? (IsSystemLightTheme() ? FarbenHell : FarbenDunkel);
                Brush bg = (Brush)conv.ConvertFromString(alarm ? theme["Rot"] : theme["Zaehlwerk"]);
                dc.DrawRoundedRectangle(bg, null, new Rect(0, 0, px, px), px * 0.2, px * 0.2);

                Typeface face = new Typeface(new FontFamily("Bahnschrift"), FontStyles.Normal, FontWeights.Bold, FontStretches.Condensed);
                double size = px * (text.Length >= 3 ? 0.72 : 0.95);
                Brush fg = (Brush)conv.ConvertFromString(theme["Ziffer"]);
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

            string text = (!r.Five.Pct.HasValue) ? "–" : r.Five.Pct.Value.ToString();
            if (text != iconText) {
                SetTrayIcon(text, r.Five.Pct.HasValue && r.Five.Pct.Value >= 90);
                iconText = text;
            }

            trayIcon.Text = (!r.Five.Pct.HasValue)
                ? "Claude Stand: noch keine Messung"
                : string.Format("Claude: 5 Stunden {0} %, Woche {1} %", r.Five.Pct.Value, r.Week.Pct.HasValue ? r.Week.Pct.Value : 0);

            if (win.IsVisible) {
                UpdateView();
            }
        }

        static void ShowStand() {
            SetTheme();
            UpdateView();
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
            } else {
                win.Opacity = 1;
            }
            UpdateView();
        }

        static void HideStand() {
            if (discClocks != null) {
                foreach (AnimationClock c in discClocks) {
                    c.Controller.Pause();
                }
            }
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

            LimitResult limitTest = new LimitResult();
            limitTest.Pct = 5;
            limitTest.Reset = now + 2 * 3600 + 14 * 60 + 30;
            check(FormatReset(limitTest, now) == "Reset in 2 h 14 min",
                "Reset-Text");

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
            uiFuenf = (StackPanel)win.FindName("Fuenf");
            uiWoche = (StackPanel)win.FindName("Woche");
            uiSchlitz = (Grid)win.FindName("Schlitz");
            uiRiffel = (TranslateTransform)win.FindName("Riffel");
            uiMarke = (TranslateTransform)win.FindName("Marke");
            uiTempo = (TextBlock)win.FindName("Tempo");
            uiChatName = (TextBlock)win.FindName("ChatName");
            uiHeuteGeld = (TextBlock)win.FindName("HeuteGeld");
            uiHeuteTokens = (TextBlock)win.FindName("HeuteTokens");
            uiWocheGeld = (TextBlock)win.FindName("WocheGeld");
            uiWocheTokens = (TextBlock)win.FindName("WocheTokens");
            uiOeffnen = (System.Windows.Controls.Button)win.FindName("Oeffnen");

            SetTheme();

            zaehlerFive = NewZaehler(uiFuenf, "5 Stunden", 18000);
            zaehlerWeek = NewZaehler(uiWoche, "Woche", 604800);

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
