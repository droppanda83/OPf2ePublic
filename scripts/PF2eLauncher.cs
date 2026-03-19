using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

internal static class PF2eLauncher
{
    private static int Main()
    {
        try
        {
            var exePath = Process.GetCurrentProcess().MainModule.FileName;
            var root = Path.GetDirectoryName(exePath);
            var backendDir = Path.Combine(root, "backend");
            var frontendDir = Path.Combine(root, "frontend");

            if (!Directory.Exists(backendDir) || !Directory.Exists(frontendDir))
            {
                Console.Error.WriteLine("Could not find backend/frontend folders next to the launcher executable.");
                return 1;
            }

            StartInNewConsole(
                workingDirectory: backendDir,
                title: "PF2e Backend",
                command: "npm run dev"
            );

            Thread.Sleep(2500);

            const int frontendPort = 5180;
            StartInNewConsole(
                workingDirectory: frontendDir,
                title: "PF2e Frontend",
                command: "npm run preview -- --port " + frontendPort + " --host localhost"
            );

            Thread.Sleep(3500);
            OpenBrowser("http://localhost:" + frontendPort + "/");

            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void StartInNewConsole(string workingDirectory, string title, string command)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c title " + title + " && " + command,
            WorkingDirectory = workingDirectory,
            UseShellExecute = true,
            CreateNoWindow = false
        };

        Process.Start(psi);
    }

    private static void OpenBrowser(string url)
    {
        var psi = new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true
        };

        Process.Start(psi);
    }
}
