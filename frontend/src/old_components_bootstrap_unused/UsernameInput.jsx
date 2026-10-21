export default function UsernameInput () {
    function handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const query = formData.get("query");
        alert(`You search for '${query}'` );
    }

    return (
        <form  onSubmit="handleSubmit">
            <input className = "bg-dark text-white" name="query" />
            <button type="submit">Search</button>
        </form>
    );
}
