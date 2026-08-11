<!--
  Cloak.svelte — render a word so it's VISUALLY readable but hard for keyword
  scanners (GoGuardian, blocker extensions) to find, and impossible to select/copy.

  How it works: the characters are stored REVERSED in the DOM, and CSS bidi-override
  paints them back in the correct visual order. So a scanner reading textContent /
  innerText / the HTML source sees e.g. "yxorp", never "proxy". `user-select: none`
  blocks selection + copy, and `aria-hidden` keeps it out of the accessibility tree.

  Usage: <Cloak text="Proxy" />  → looks like "Proxy", reads as "yxorP" to machines.
-->
<script lang="ts">
	export let text: string = '';
	// Reverse so the real keyword never appears verbatim anywhere machine-readable.
	$: reversed = [...text].reverse().join('');
</script>

<span class="kz-cloak" aria-hidden="true">{reversed}</span>
