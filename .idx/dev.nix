# Entorno en la nube para Project IDX / Antigravity (Clase 11): sirve para correr la app
# en el navegador cuando la computadora no alcanza para un emulador local.
{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22
  ];
  env = {};
  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
    ];
    workspace = {
      onCreate = {
        npm-install = "npm ci";
      };
    };
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "web" "--" "--port" "$PORT"];
          manager = "web";
        };
        android = {
          command = ["npm" "run" "android"];
          manager = "android";
        };
      };
    };
  };
}
