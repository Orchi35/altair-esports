import ArchivePlayerDetailPage from "./ArchivePlayerDetailPage.jsx";
import VpgPlayerProfile from "./VpgPlayerProfile.jsx";
export default function PlayerDetailPage(props){
  return /^vpg-[1-9]\d{0,9}$/.test(props.slug) ? <VpgPlayerProfile key={props.slug} {...props} id={props.slug.slice(4)}/> : <ArchivePlayerDetailPage {...props}/>;
}
