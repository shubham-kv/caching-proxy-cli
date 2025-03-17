export const sampleData = {
  json: {
    id: 1,
    message: "Hello World",
  },
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<messages>
  <message id="1">
    <timestamp>2023-10-27T10:00:00Z</timestamp>
    <body>Hello World!</body>
  </message>
</messages>
`,
  plainTxt: "This is to test requests with 'text/plain' response content type",
  html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Hello</title>
	<link rel="stylesheet" type="text/css" media="screen" href="/public/sample-styles.css">
</head>
<body>
	<h2>Hello World</h2>
  <p>This is to test requests with 'text/html' response content type</p>
  <script src="/public/sample-script"></script>
</body>
</html>
`,
  css: `
body {
  margin: 0;
  padding: 0;
  background: black;
  color: white;
}
`,
  javascript: `console.log("This is to test requests with 'javascript' response content types")`
};
