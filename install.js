module.exports = {
  requires: { bundle: "ai" },
  run: [
    // 1. Клонируем приложение
    {
      when: "{{!exists('app')}}",
      method: "shell.run",
      params: { message: ["git clone https://github.com/timoncool/HiggsAudio-Studio app"] }
    },
    // 2. Python-зависимости (UV_HTTP_TIMEOUT — иначе большие колёса падают по 30с-таймауту)
    {
      method: "shell.run",
      params: {
        venv: "env", venv_python: "3.12", path: "app",
        env: { UV_HTTP_TIMEOUT: "600" },
        message: ["uv pip install -r requirements.txt"]
      }
    },
    // 3. torch (+ triton для torch.compile) — кроссплатформенно
    {
      method: "script.start",
      params: { uri: "torch.js", params: { venv: "env", venv_python: "3.12", path: "app", triton: true } }
    },
    // 4. llama-cpp-python (GGUF-режиссёр на GPU) — NVIDIA Windows x64.
    // Сборка JamePeng: рантайм-диспетчер CPU-микроархитектур (НЕ форсит AVX-512 → не падает
    // 0xc000001d на Intel 12/13/14-gen, где AVX-512 отключён аппаратно) + свежий llama.cpp
    // (поддержка гибридных attention+SSM моделей) + CUDA 12.8 (совпадает с torch, свой cublas в комплекте).
    {
      when: "{{gpu === 'nvidia' && platform === 'win32'}}",
      method: "shell.run",
      params: {
        venv: "env", venv_python: "3.12", path: "app",
        message: ["uv pip install https://github.com/JamePeng/llama-cpp-python/releases/download/v0.3.40-cu128-win-20260608/llama_cpp_python-0.3.40%2Bcu128-cp312-cp312-win_amd64.whl"]
      }
    },
    // 4-linux. llama-cpp-python — NVIDIA Linux x64 (та же JamePeng cu128-сборка).
    {
      when: "{{gpu === 'nvidia' && platform === 'linux' && arch !== 'arm64'}}",
      method: "shell.run",
      params: {
        venv: "env", venv_python: "3.12", path: "app",
        message: ["uv pip install https://github.com/JamePeng/llama-cpp-python/releases/download/v0.3.40-cu128-linux-20260607/llama_cpp_python-0.3.40%2Bcu128-cp312-cp312-linux_x86_64.whl"]
      }
    },
    // 4-arm. llama-cpp-python — NVIDIA Linux aarch64 (Jetson/DGX): JamePeng не публикует arm64-колёса → abetlen-фоллбэк.
    {
      when: "{{gpu === 'nvidia' && platform === 'linux' && arch === 'arm64'}}",
      method: "shell.run",
      params: {
        venv: "env", venv_python: "3.12", path: "app",
        message: ["uv pip install llama-cpp-python --only-binary=:all: --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu124"]
      }
    },
    // 4b. llama-cpp-python — без NVIDIA (CPU)
    {
      when: "{{gpu !== 'nvidia'}}",
      method: "shell.run",
      params: {
        venv: "env", venv_python: "3.12", path: "app",
        message: ["uv pip install llama-cpp-python --only-binary=:all: --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu"]
      }
    },
    // 6. Стартовый voice-pack (русские/EN пресеты)
    {
      when: "{{!exists('app/voices/RU_Male_Goblin_Puchkov.mp3')}}",
      method: "shell.run",
      params: { path: "app", message: ["curl -L -o voice-pack.zip https://huggingface.co/datasets/nerualdreming/VibeVoice/resolve/main/voice-pack.zip"] }
    },
    {
      when: "{{!exists('app/voices/RU_Male_Goblin_Puchkov.mp3')}}",
      method: "shell.run",
      params: { venv: "env", venv_python: "3.12", path: "app", message: ["python {{cwd}}/get_voicepack.py"] }
    },
    // готово
    {
      method: "input",
      params: { title: "Установка завершена / Install complete", description: "Higgs Audio Studio готов. Нажми Start (первый запуск дольше — прогрев компиляции)." }
    }
  ]
}
