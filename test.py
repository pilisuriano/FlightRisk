from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    page = browser.new_page()

    page.goto(
        "https://www.airlinequality.com/airline-reviews/delta-air-lines/",
        wait_until="networkidle"
    )

    print(page.title())

    html = page.content()

    print(len(html))

    browser.close()