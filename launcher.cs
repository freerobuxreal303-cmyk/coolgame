using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Diagnostics;

namespace CoolGameLauncher
{
    class Program
    {
        private static HttpListener _listener;
        private static string _baseDir;
        private static volatile bool _running = true;
        private static DateTime _lastHeartbeat = DateTime.UtcNow;
        private static bool _heartbeatReceivedOnce = false;

        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                _baseDir = AppDomain.CurrentDomain.BaseDirectory;
                int port = GetAvailablePort();

                _listener = new HttpListener();
                _listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
                _listener.Start();

                Thread serverThread = new Thread(ServerWorker);
                serverThread.IsBackground = true;
                serverThread.Start();

                Thread watchdogThread = new Thread(WatchdogWorker);
                watchdogThread.IsBackground = true;
                watchdogThread.Start();

                string gameUrl = "http://127.0.0.1:" + port + "/index.html";
                string browserPath = FindBrowserExecutable();

                string tempProfile = Path.Combine(Path.GetTempPath(), "coolgame_edge_profile");

                if (!string.IsNullOrEmpty(browserPath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserPath;
                    psi.Arguments = string.Format("--app=\"{0}\" --window-size=1280,768 --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check --disable-features=TranslateUI --disable-extensions", gameUrl, tempProfile);
                    psi.UseShellExecute = false;
                    Process.Start(psi);
                }
                else
                {
                    Process.Start(gameUrl);
                }

                // Keep main thread running while the game window is active
                while (_running)
                {
                    Thread.Sleep(500);
                }
            }
            catch (Exception)
            {
                // Silently handle
            }
            finally
            {
                _running = false;
                try { if (_listener != null && _listener.IsListening) _listener.Stop(); } catch { }
            }
        }

        private static int GetAvailablePort()
        {
            TcpListener l = new TcpListener(IPAddress.Loopback, 0);
            l.Start();
            int port = ((IPEndPoint)l.LocalEndpoint).Port;
            l.Stop();
            return port;
        }

        private static string FindBrowserExecutable()
        {
            string[] possiblePaths = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (string p in possiblePaths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }

        private static void WatchdogWorker()
        {
            DateTime startTime = DateTime.UtcNow;
            while (_running)
            {
                Thread.Sleep(1000);
                TimeSpan elapsed = DateTime.UtcNow - startTime;

                // After initial 25-second boot grace period:
                if (elapsed.TotalSeconds > 25)
                {
                    if (_heartbeatReceivedOnce)
                    {
                        // If we received heartbeats before but haven't for > 7 seconds, user closed window!
                        if ((DateTime.UtcNow - _lastHeartbeat).TotalSeconds > 7)
                        {
                            _running = false;
                            break;
                        }
                    }
                    else
                    {
                        // No heartbeat ever received after 45 seconds -> user closed or failed to open
                        if (elapsed.TotalSeconds > 45)
                        {
                            _running = false;
                            break;
                        }
                    }
                }
            }
        }

        private static void ServerWorker()
        {
            while (_running && _listener != null && _listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch
                {
                    break;
                }
            }
        }

        private static void ProcessRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath;

                // Heartbeat API endpoint
                if (rawUrl.Equals("/api/heartbeat", StringComparison.OrdinalIgnoreCase))
                {
                    _lastHeartbeat = DateTime.UtcNow;
                    _heartbeatReceivedOnce = true;
                    byte[] response = System.Text.Encoding.UTF8.GetBytes("{\"status\":\"alive\"}");
                    context.Response.ContentType = "application/json";
                    context.Response.ContentLength64 = response.Length;
                    context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                    context.Response.OutputStream.Write(response, 0, response.Length);
                    return;
                }

                // File Serving
                string relativePath = rawUrl.TrimStart('/');
                if (string.IsNullOrEmpty(relativePath)) relativePath = "index.html";

                relativePath = relativePath.Replace('/', Path.DirectorySeparatorChar);
                string filePath = Path.Combine(_baseDir, relativePath);

                if (File.Exists(filePath))
                {
                    byte[] fileBytes = File.ReadAllBytes(filePath);
                    context.Response.ContentType = GetMimeType(filePath);
                    context.Response.ContentLength64 = fileBytes.Length;
                    context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                    context.Response.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                }
                else
                {
                    context.Response.StatusCode = 404;
                }
            }
            catch
            {
                try { context.Response.StatusCode = 500; } catch { }
            }
            finally
            {
                try { context.Response.OutputStream.Close(); } catch { }
            }
        }

        private static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            switch (ext)
            {
                case ".html": return "text/html; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".js": return "application/javascript; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".png": return "image/png";
                case ".jpg":
                case ".jpeg": return "image/jpeg";
                case ".svg": return "image/svg+xml";
                case ".ico": return "image/x-icon";
                case ".mp3": return "audio/mpeg";
                case ".wav": return "audio/wav";
                default: return "application/octet-stream";
            }
        }
    }
}
