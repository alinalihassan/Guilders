type TemplateOptions = {
  status: "success" | "error";
  title?: string;
  message?: string;
};

function getTemplate({
  status,
  title = status === "success" ? "Connection Successful!" : "Connection Failed",
  message = status === "success"
    ? "You can safely close this window and return to Guilders."
    : "There was an error connecting to your bank. Please close this window and try again in Guilders.",
}: TemplateOptions) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f9fafb;
        }
        .message {
            text-align: center;
            padding: 2rem;
            background-color: white;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 1rem;
        }
        .success { color: #059669; }
        .error { color: #dc2626; }
        .note {
            margin-top: 1rem;
            font-size: 0.875rem;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="message">
        <h2 class="${status}">${title}</h2>
        <p>${message}</p>
        <p class="note">This window can be safely closed.</p>
    </div>
    <script>
        window.onload = function() {
            window.parent.postMessage({ stage: "${status}" }, "*");
        }
    </script>
</body>
</html>
`;
}

export const htmlResponse = (status: "success" | "error", message: string) =>
  new Response(getTemplate({ status, message }), {
    headers: { "Content-Type": "text/html" },
  });

export const errorResponse = (message: string) => htmlResponse("error", message);
export const successResponse = (message: string) => htmlResponse("success", message);
