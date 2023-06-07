# stacktical-dsla-oracle-statuspage
A Public StatusPage Chainlink external adapter for DSLA Protocol.

## Development

### Getting started

1. Set your `.env` based on the `env-example`

2. Install dependencies

```
npm i
```

3. Run the Oracle

```
npm run watch
```

## Deployment

```
npm install --save-dev @google-cloud/functions-framework
```

Generate `.env.yaml` from the `.env` file, then:

```
gcloud functions deploy dsla-oracle-statuspage \
    --region=your-reguib--source=. \
    --trigger-http --allow-unauthenticated \
    --runtime=nodejs16 --env-vars-file=./.env.yaml \
    --timeout=720s
```