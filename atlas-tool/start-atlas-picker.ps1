$ErrorActionPreference = 'Stop'

$projectDir = 'C:\Users\DropP\OneDrive - The Cairnmillar Institute\Documents\GitHub\OPf2ePublic\atlas-tool'
$npmCmd = 'npm.cmd'

Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "cd /d `"$projectDir`" && $npmCmd run dev:server" -WorkingDirectory $projectDir -WindowStyle Normal
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "cd /d `"$projectDir`" && $npmCmd run dev:client -- --port 5175 --strictPort" -WorkingDirectory $projectDir -WindowStyle Normal

Start-Sleep -Seconds 6
Start-Process 'http://localhost:5175/?page=database'
