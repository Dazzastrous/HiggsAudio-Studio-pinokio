module.exports = async (kernel) => {
  const port = await kernel.port()
  return {
    daemon: true,
    run: [
      {
        method: "shell.run",
        params: {
          venv: "env",
          venv_python: "3.12",
          path: "app",
          env: {
            GRADIO_SERVER_PORT: `${port}`,
            NO_AUTO_BROWSER: "true",
            HF_HOME: "{{path.resolve(cwd,'app/models')}}",
            HUGGINGFACE_HUB_CACHE: "{{path.resolve(cwd,'app/models')}}",
            TRANSFORMERS_CACHE: "{{path.resolve(cwd,'app/models')}}",
            PYTHONIOENCODING: "utf-8",
            PYTHONUNBUFFERED: "1",
            // torch грузит Intel OpenMP (libiomp5), llama.cpp — LLVM OpenMP (libomp140);
            // в одном процессе это даёт OMP Error #15 → abort при инференсе режиссёра. Разрешаем сосуществование.
            KMP_DUPLICATE_LIB_OK: "TRUE",
            // Offline mode (set by the "Start (Offline)" menu entry): models are pre-cached by install.js,
            // so HF/Transformers never reach the network. Default Start leaves these off so the optional
            // cloud-voice browser still works online.
            HF_HUB_OFFLINE: "{{args.offline ? '1' : '0'}}",
            TRANSFORMERS_OFFLINE: "{{args.offline ? '1' : '0'}}"
          },
          message: ["python app.py"],
          on: [{
            event: "/(https?:\\/\\/[0-9.:]+:[0-9]+)/",
            done: true
          }]
        }
      },
      {
        method: "local.set",
        params: { url: "{{input.event[1]}}" }
      }
    ]
  }
}
