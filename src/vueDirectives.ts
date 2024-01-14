import { ref } from "vue";

interface IResizeElement extends HTMLElement {
    _handleResize: () => void;
}

const vResize = {
    beforeMount(el: IResizeElement, binding: any) {
        const width = ref(el.clientWidth);
        const height = ref(el.clientHeight);

        const handleResize = () => {
            width.value = el.clientWidth;
            height.value = el.clientHeight;

            if (typeof binding.value === "function") {
                binding.value(width.value, height.value);
            }
        };

        window.addEventListener("resize", handleResize);

        el._handleResize = handleResize;
    },
    unmounted(el: IResizeElement) {
        window.removeEventListener("resize", el._handleResize);
    },
};

export {
    vResize,
};