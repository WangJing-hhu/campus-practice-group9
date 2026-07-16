@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup script for Windows
@REM ----------------------------------------------------------------------------
@REM Required ENV vars:
@REM   JAVA_HOME - location of a JDK home dir
@REM ----------------------------------------------------------------------------

@setlocal

set "MAVEN_PROJECTBASEDIR=%~dp0"
set "MAVEN_HOME=%MAVEN_PROJECTBASEDIR%\.mvn\maven"
set "MAVEN_ZIP=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven.zip"

@REM ==== 1) Find JAVA_HOME ====
if not "%JAVA_HOME%"=="" goto findJavaFromJavaHome
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo Please set the JAVA_HOME variable in your environment to match the location of your Java installation.
exit /b 1

:findJavaFromJavaHome
set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
if exist "%JAVA_EXE%" goto downloadMaven

echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo Please set the JAVA_HOME variable in your environment to match the location of your Java installation.
exit /b 1

@REM ==== 2) Download Maven if not cached ====
:downloadMaven
set "MAVEN_VERSION=3.9.9"
set "MAVEN_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip"

if exist "%MAVEN_HOME%\bin\mvn.cmd" goto runMaven

echo [Maven Wrapper] Downloading Maven %MAVEN_VERSION%...

@REM Create .mvn/maven directory
if not exist "%MAVEN_HOME%" mkdir "%MAVEN_HOME%"

@REM Use PowerShell to download
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%'" 2>&1
if not exist "%MAVEN_ZIP%" (
    echo ERROR: Failed to download Maven from %MAVEN_URL%
    exit /b 1
)

@REM Extract
powershell -Command "Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%MAVEN_HOME%' -Force" 2>&1

@REM Move contents up one level (Expand-Archive creates apache-maven-x.x.x subfolder)
for /d %%d in ("%MAVEN_HOME%\apache-maven-*") do (
    xcopy /E /Y /Q "%%d\*" "%MAVEN_HOME%\" >nul 2>&1
    rmdir /S /Q "%%d" >nul 2>&1
)

del "%MAVEN_ZIP%" >nul 2>&1

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
    echo ERROR: Maven extraction failed
    exit /b 1
)
echo [Maven Wrapper] Maven %MAVEN_VERSION% ready.

@REM ==== 3) Run Maven ====
:runMaven
"%MAVEN_HOME%\bin\mvn.cmd" %*

@endlocal
