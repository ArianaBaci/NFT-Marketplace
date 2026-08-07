/*Quando erediti da ERC721URIStorage e Ownable, 
tutta la logica "pesante" — transferFrom, approve, ownerOf,
 balanceOf, i controlli di sicurezza su onlyOwner, la gestione 
 degli operator, ecc. — non l'hai scritta tu. È codice di OpenZeppelin,
 già testato, auditato e usato da migliaia di progetti in produzione.*/