$ErrorActionPreference = 'Stop'

$DistroName = 'ubuntu24'
$DefaultLinuxUser = 'jcguimaraes'

function Write-Step {
	param([string]$Message)
	Write-Host ""
	Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Info {
	param([string]$Message)
	Write-Host "    $Message" -ForegroundColor DarkGray
}

function Invoke-WslCommand {
	param(
		[string[]]$Arguments,
		[string]$Description
	)

	Write-Step -Message $Description
	Write-Info -Message ("Executando: wsl {0}" -f ($Arguments -join ' '))

	& wsl @Arguments
	if ($LASTEXITCODE -ne 0) {
		throw ("Falha ao executar 'wsl {0}'. ExitCode: {1}" -f ($Arguments -join ' '), $LASTEXITCODE)
	}

	Write-Host "    OK" -ForegroundColor Green
}

function Set-WslConfigMemoryAndSwap {
	param([string]$FilePath)

	Write-Step -Message "Garantindo configuracao do arquivo .wslconfig"
	Write-Info -Message "Arquivo alvo: $FilePath"

	$existingLines = @()
	if (Test-Path -Path $FilePath) {
		$existingLines = Get-Content -Path $FilePath
	}

	$updatedLines = New-Object 'System.Collections.Generic.List[string]'
	$foundWsl2Section = $false
	$insideWsl2Section = $false
	$memorySet = $false
	$swapSet = $false

	# Parse simples de INI para garantir as chaves em [wsl2] sem perder outras secoes.
	foreach ($line in $existingLines) {
		if ($line -match '^\s*\[(.+)\]\s*$') {
			if ($insideWsl2Section) {
				if (-not $memorySet) { $updatedLines.Add('memory=8GB') }
				if (-not $swapSet) { $updatedLines.Add('swap=2GB') }
				$insideWsl2Section = $false
			}

			$sectionName = $matches[1].Trim().ToLowerInvariant()
			if ($sectionName -eq 'wsl2') {
				$foundWsl2Section = $true
				$insideWsl2Section = $true
				$memorySet = $false
				$swapSet = $false
			}

			$updatedLines.Add($line)
			continue
		}

		if ($insideWsl2Section) {
			if ($line -match '^\s*memory\s*=') {
				if (-not $memorySet) {
					$updatedLines.Add('memory=8GB')
					$memorySet = $true
				}
				continue
			}

			if ($line -match '^\s*swap\s*=') {
				if (-not $swapSet) {
					$updatedLines.Add('swap=2GB')
					$swapSet = $true
				}
				continue
			}
		}

		$updatedLines.Add($line)
	}

	if ($insideWsl2Section) {
		if (-not $memorySet) { $updatedLines.Add('memory=8GB') }
		if (-not $swapSet) { $updatedLines.Add('swap=2GB') }
	}

	if (-not $foundWsl2Section) {
		if ($updatedLines.Count -gt 0 -and $updatedLines[$updatedLines.Count - 1].Trim().Length -ne 0) {
			$updatedLines.Add('')
		}
		$updatedLines.Add('[wsl2]')
		$updatedLines.Add('memory=8GB')
		$updatedLines.Add('swap=2GB')
	}

	Set-Content -Path $FilePath -Value $updatedLines -Encoding Ascii
	Write-Host "    OK" -ForegroundColor Green
}

function Set-WslConfSystemdAndDefaultUser {
	param(
		[string]$FilePath,
		[string]$DefaultUser
	)

	Write-Step -Message "Garantindo configuracao do arquivo wsl.conf da distro"
	Write-Info -Message "Arquivo alvo: $FilePath"

	$existingLines = @()
	if (Test-Path -Path $FilePath) {
		$existingLines = Get-Content -Path $FilePath
	}

	$updatedLines = New-Object 'System.Collections.Generic.List[string]'
	$foundBootSection = $false
	$foundUserSection = $false
	$insideBootSection = $false
	$insideUserSection = $false
	$systemdSet = $false
	$defaultUserSet = $false

	# Parse simples de INI para garantir [boot]/systemd e [user]/default sem duplicar chaves.
	foreach ($line in $existingLines) {
		if ($line -match '^\s*\[(.+)\]\s*$') {
			if ($insideBootSection -and -not $systemdSet) {
				$updatedLines.Add('systemd=true')
			}

			if ($insideUserSection -and -not $defaultUserSet) {
				$updatedLines.Add("default=$DefaultUser")
			}

			$insideBootSection = $false
			$insideUserSection = $false

			$sectionName = $matches[1].Trim().ToLowerInvariant()
			if ($sectionName -eq 'boot') {
				$foundBootSection = $true
				$insideBootSection = $true
				$systemdSet = $false
			}
			elseif ($sectionName -eq 'user') {
				$foundUserSection = $true
				$insideUserSection = $true
				$defaultUserSet = $false
			}

			$updatedLines.Add($line)
			continue
		}

		if ($insideBootSection -and $line -match '^\s*systemd\s*=') {
			if (-not $systemdSet) {
				$updatedLines.Add('systemd=true')
				$systemdSet = $true
			}
			continue
		}

		if ($insideUserSection -and $line -match '^\s*default\s*=') {
			if (-not $defaultUserSet) {
				$updatedLines.Add("default=$DefaultUser")
				$defaultUserSet = $true
			}
			continue
		}

		$updatedLines.Add($line)
	}

	if ($insideBootSection -and -not $systemdSet) {
		$updatedLines.Add('systemd=true')
	}

	if ($insideUserSection -and -not $defaultUserSet) {
		$updatedLines.Add("default=$DefaultUser")
	}

	if (-not $foundBootSection) {
		if ($updatedLines.Count -gt 0 -and $updatedLines[$updatedLines.Count - 1].Trim().Length -ne 0) {
			$updatedLines.Add('')
		}
		$updatedLines.Add('[boot]')
		$updatedLines.Add('systemd=true')
	}

	if (-not $foundUserSection) {
		if ($updatedLines.Count -gt 0 -and $updatedLines[$updatedLines.Count - 1].Trim().Length -ne 0) {
			$updatedLines.Add('')
		}
		$updatedLines.Add('[user]')
		$updatedLines.Add("default=$DefaultUser")
	}

	Set-Content -Path $FilePath -Value $updatedLines -Encoding Ascii
	Write-Host "    OK" -ForegroundColor Green
}

try {
	Invoke-WslCommand -Arguments @('--install', 'Ubuntu-24.04', '--name', $DistroName) -Description "Baixando distro Ubuntu 24.04 (nome: $DistroName)"
	Invoke-WslCommand -Arguments @('--set-default', $DistroName) -Description "Definindo $DistroName como distro padrao"

	$wslConfigPath = Join-Path $env:USERPROFILE '.wslconfig'
	Set-WslConfigMemoryAndSwap -FilePath $wslConfigPath

	Invoke-WslCommand -Arguments @('-d', $DistroName, '--exec', 'sh', '-lc', 'true') -Description "Garantindo que a distro $DistroName esta de pe"

	$wslConfPath = "\\wsl$\$DistroName\etc\wsl.conf"
	Set-WslConfSystemdAndDefaultUser -FilePath $wslConfPath -DefaultUser $DefaultLinuxUser

	Invoke-WslCommand -Arguments @('--shutdown') -Description 'Reiniciando WSL para refletir alteracoes'

	Write-Host ""
	Write-Host "Processo concluido com sucesso!" -ForegroundColor Green
	Write-Host "Execute 'wsl' para iniciar a distro e execute o script 2" -ForegroundColor Green
}
catch {
	Write-Host ""
	Write-Host ("ERRO: {0}" -f $_.Exception.Message) -ForegroundColor Red
	exit 1
}
