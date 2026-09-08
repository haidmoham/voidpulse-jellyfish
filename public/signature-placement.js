const place = () => {
 const target = document.querySelector(".title-block");
 if(!target || target.querySelector('shin86-signature')) return;
 const host = document.createElement('div'); host.className = 'signature-placement'; host.style.cssText = "margin-top:8px;";
 host.innerHTML = '<shin86-signature motion-source="#motion" motion-value="false" quiet></shin86-signature>'; target.append(host);
};
place();
new MutationObserver(place).observe(document.body,{childList:true,subtree:true});
