const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Carrega o ficheiro OpenAPI
const openapiDoc = YAML.load(path.join(__dirname, 'swagger.yaml'));

module.exports = (app) => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc, {
    swaggerOptions: { persistAuthorization: true }
  }));

  // Endpoint para obter o JSON bruto
  app.get('/openapi.json', (req, res) => res.json(openapiDoc));
};
