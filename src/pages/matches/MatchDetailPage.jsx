import ArchiveMatchDetailPage from "./ArchiveMatchDetailPage.jsx";
import VpgMatchDetailPage from "./VpgMatchDetailPage.jsx";
export default function MatchDetailPage(props) {
  return /^match-vpg-[1-9]\d{0,9}$/.test(props.slug) ? <VpgMatchDetailPage key={props.slug} {...props} id={props.slug.slice(10)}/> : <ArchiveMatchDetailPage {...props}/>;
}
