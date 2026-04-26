import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export async function fetchSitemapLinks(sitemapUrl: string): Promise<string[]> {
  try {
    const res = await axios.get(sitemapUrl);
    const parser = new XMLParser();
    const jsonObj = parser.parse(res.data);

    if (!jsonObj.urlset || !jsonObj.urlset.url) {
      return [];
    }

    const urls = Array.isArray(jsonObj.urlset.url)
      ? jsonObj.urlset.url.map((u: any) => u.loc)
      : [jsonObj.urlset.url.loc];

    return urls;
  } catch (error) {
    console.error("Error fetching sitemap:", error);
    return [];
  }
}
