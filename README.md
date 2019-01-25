# basecamp3-downloader

## A simple node.js module to download all resources available to a basecamp 3 user

This is a simple tool that downloads and stores all the basecamp resources a given user has access to. I found a need for a tool that comprehensively downloads resources from basecamp and had a spare couple of evenings, and so here we are!

I really hope it gets some use. Enjoy!

## How to use

First, the tool needs some information. Run ..

    . get_info.sh

.. which will guide you through the process of obtaining a token to access the basecamp 3 api.

Afterwards, run ..

    npm install
    node index.js

.. to download the resources from basecamp.

### Advanced usage

- Most of the prompts in `get_info.sh` will remember your past answers for later runs, so feel free to exit it if you need to.
- It also writes a file `get_info.env.sh` as it goes with the environment variables obtained. Use this later via `. get_info.env.sh`
- Run `node index.js --help` for more options to the resource downloading app.

## How it works

First, it downloads your home page (i.e. `https://3.basecamp.com/<projectid>/projects`)

When the tool parses any downloaded JSON resources, it searches them for URLs of other basecamp resources. If it finds one it doesn't know about, it queues it for download.

The actual downloading happens on an interval, with a default of one resource per second (adjustable, but this tool makes a lot of requests so please keep it high to be polite to the basecamp servers), so make a coffee or something, it may take a while.

The results are put in the `results` directory:

- `resuilts/docs`: all non-JSON resources are downloaded to files in this dir.
- `results/results.json`: the main results json file. It contains a root with two main keys:
  - `byURL`: gives the URLs of all resources downloaded, and for each gives the path where the body of the resource are stored.
  - `byPath`: the contents of all the resources, given as the leaves of a tree with a structure based on the URLs (like `byPath.buckets.chat.json`) which makes it a little easier to look for a particular type of resource.
    - For resources that are not JSON, the value given in this JSON file is the path of the file in the `results/docs` directory where the resource file is stored.
- `results/tmp_results.json`: stores the partial `results.json` file every so often just in case the tool crashes before finishing (this seems to be very rare, never happened to me, but the temp file is a nice backstop. Default interval is 10 seconds)

### Ordering

Finder order: First-found-first-downloaded, last-found-last-downloaded.

## Required tooling

The `get_info.sh` script requires `curl` (for requests), `python3` (for urlencoding) and `jq` (for decoding JSON).
It was made on a mac, so that script uses `open` to open webpages.

None of these are fundamental, and the script could easily be made to use different tools for these jobs.

The main downloader program uses `npm` and `node`.
I have versions 5.6.0 (`npm`), and 9.9.0 (`node`).

## Licence

MIT

## Copyright

Will Smart
